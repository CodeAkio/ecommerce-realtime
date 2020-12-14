'use strict'

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

const Coupon = use('App/Models/Coupon')
const Database = use('Database')
const CouponService = use('App/Services/Coupon/CouponService')
const CouponTransformer = use('App/Transformers/Admin/CouponTransformer')

/**
 * Resourceful controller for interacting with coupons
 */
class CouponController {
  /**
   * Show a list of all coupons.
   * GET coupons
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {object} ctx.pagination
   */
  async index ({ request, response, pagination, transform }) {
    const code = request.input('code')
    const query = Coupon.query()

    if (code) {
      query.where('code', 'ilike', `%${code}%`)
    }

    let coupons = await query.paginate(pagination.page, pagination.limit)
    coupons = await transform.paginate(coupons, CouponTransformer)

    return response.send(coupons)
  }

  /**
   * Create/save a new coupon.
   * POST coupons
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store ({ request, response, transform }) {
    const trx = await Database.beginTransaction()

    let can_use_for = {
      product: false,
      customer: false
    }

    const couponData = request.only([
      'code',
      'discount',
      'valid_from',
      'valid_until',
      'quantity',
      'type',
      'recursive'
    ])

    const { users, products } = request.only(['users', 'products'])

    try {
      let coupon = await Coupon.create(couponData, trx)
      const couponService = new CouponService(coupon, trx)

      if (users && users.length > 0) {
        await couponService.syncUsers(users)
        can_use_for.customer = true
      }

      if (products && products.length > 0) {
        await couponService.syncProducts(products)
        can_use_for.product = true
      }

      if (can_use_for.product && can_use_for.customer) {
        coupon.can_use_for = 'product_client'
      } else if (can_use_for.product && !can_use_for.customer) {
        coupon.can_use_for = 'product'
      } else if (!can_use_for.product && can_use_for.customer) {
        coupon.can_use_for = 'client'
      } else {
        coupon.can_use_for = 'all'
      }

      await coupon.save(trx)
      await trx.commit()
      coupon = await transform
        .include('users,products')
        .item(coupon, CouponTransformer)

      return response.status(201).send(coupon)
    } catch (error) {
      await trx.rollback()

      return response.status(400).send({
        message: "Não foi possível criar o cupom"
      })
    }
  }

  /**
   * Display a single coupon.
   * GET coupons/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async show ({ params: { id }, request, response, transform }) {
    let coupon = await Coupon.findOrFail(id)
    coupon = await transform
      .include('users,products,orders')
      .item(coupon, CouponTransformer)

    return response.send(coupon)
  }

  /**
   * Update coupon details.
   * PUT or PATCH coupons/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async update ({ params: { id }, request, response, transform }) {
    const trx = await Database.beginTransaction()
    const { users, products } = request.only(['users', 'products'])
    let coupon = Coupon.findOrFail(id)

    let can_use_for = {
      product: false,
      customer: false
    }

    const couponData = request.only([
      'code',
      'discount',
      'valid_from',
      'valid_until',
      'quantity',
      'type',
      'recursive'
    ])

    try {
      await coupon.merge(couponData)

      const couponService = new CouponService(coupon, trx)

      if (users && users.length > 0) {
        await couponService.syncUsers(users)
        can_use_for.customer = true
      }

      if (products && products.length > 0) {
        await couponService.syncProducts(products)
        can_use_for.product = true
      }

      if (can_use_for.product && can_use_for.customer) {
        coupon.can_use_for = 'product_client'
      } else if (can_use_for.product && !can_use_for.customer) {
        coupon.can_use_for = 'product'
      } else if (!can_use_for.product && can_use_for.customer) {
        coupon.can_use_for = 'client'
      } else {
        coupon.can_use_for = 'all'
      }

      await coupon.save(trx)
      await trx.commit()
      coupon = await transform.item(coupon, CouponTransformer)

      return response.send(coupon)
    } catch (error) {
      await trx.rollback()

      return response.status(400).send({
        message: "Não foi possível criar o cupom"
      })
    }
  }

  /**
   * Delete a coupon with id.
   * DELETE coupons/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroy ({ params: { id }, request, response }) {
    const trx = await Database.beginTransaction()
    const coupon = await Coupon.findOrFail(id)

    try {
      await coupon.products().detach([], trx)
      await coupon.orders().detach([], trx)
      await coupon.users().detach([], trx)
      await coupon.delete(trx)
      await trx.commit()

      return response.status(204).send()
    } catch (error) {
      await trx.rollback()

      return response.status(400).send({
        message: "Não foi possível remover o cupom"
      })
    }
  }
}

module.exports = CouponController
