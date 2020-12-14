'use strict'

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

const Order = use('App/Models/Order')
const Coupon = use('App/Models/Coupon')
const Discount = use('App/Models/Discount')
const Database = use('Database')
const OrderService = use('App/Services/Coupon/OrderService')
const OrderTransformer = use('App/Transformers/Admin/OrderTransformer')

/**
 * Resourceful controller for interacting with orders
 */
class OrderController {
  /**
   * Show a list of all orders.
   * GET orders
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {object} ctx.pagination
   */
  async index ({ request, response, pagination, transform }) {
    const { status, id } = request.only(['status', 'id'])
    const query = Order.query()

    if (status && id) {
      query.where('status', status)
      query.orWhere('id', 'ilike', `%${id}%`)
    } else if (status) {
      query.where('status', status)
    } else if (id) {
      query.where('id', 'ilike', `%${id}%`)
    }

    let orders = await query.paginate(pagination.page, pagination.limit)
    orders = await transform.paginate(orders, OrderTransformer)

    return response.send(orders)
  }

  /**
   * Create/save a new order.
   * POST orders
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store ({ request, response, transform }) {
    const trx = await Database.beginTransaction()
    const { user_id, items, status } = request.all()

    try {
      let order = await Order.create({ user_id, status }, trx)

      const orderService = new OrderService(order, trx)

      if(items && items.length > 0) {
        await orderService.syncItems(items)
      }

      await order.save(trx)
      await trx.commit()
      order = await Order.find(order.id)
      order = await transform.include('user,items').item(order, OrderTransformer)

      return response.status(201).send(order)
    } catch (error) {
      await trx.rollback()

      return response.status(400).send({
        message: "Não foi possível criar o pedido"
      })
    }
  }

  /**
   * Display a single order.
   * GET orders/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async show ({ params: { id }, request, response, transform }) {
    let order = await Order.findOrFail(id)
    order = await transform
      .include('user,items,discounts')
      .item(order, OrderTransformer)

    return response.send(order)
  }

  /**
   * Update order details.
   * PUT or PATCH orders/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async update ({ params: { id }, request, response, transform }) {
    let order = Order.findOrFail(id)
    const trx = await Database.beginTransaction()
    const { user_id, items, status } = request.all()

    try {
      order.merge({ user_id, status })

      const orderService = new OrderService(order, trx)
      await orderService.updateItems(items)

      await order.save(trx)
      await trx.commit()
      order = await transform.include('user,items,discounts,coupons').item(order, OrderTransformer)

      return response.send(order)
    } catch (error) {
      await trx.rollback()

      return response.status(400).send({
        message: "Não foi possível atualizar o pedido"
      })
    }
  }

  /**
   * Delete a order with id.
   * DELETE orders/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroy ({ params: { id }, request, response }) {
    const order = await Order.findOrFail(id)
    const trx = await Database.beginTransaction()

    try {
      await order.items().delete(trx)
      await order.coupons().delete(trx)
      await order.delete(trx)
      await trx.commit()

      return response.status(204).send()
    } catch (error) {
      await trx.rollback()

      return response.status(400).send({
        message: "Não foi possível remover o pedido"
      })
    }
  }

  async applyDiscount({ params: { id }, request, response, transform }) {
    const { code } = request.all()
    const coupon = await Coupon.findOrFail('code', code.toUpperCase())
    let order = await Order.findOrFail(id)

    let discount = {}
    let info = {}

    try {
      const orderService = new OrderService(order)
      const canAddDiscount = await orderService.canApplyDiscount(coupon)
      const orderDiscounts = await order.coupons().getCount()

      const canApplyToOrder = orderDiscounts < 1 || (orderDiscounts >= 1 && coupon.recursive)

      if (canAddDiscount && canApplyToOrder) {
        discount = await Discount.findOrCreate({
          order_id: order.id,
          coupon_id: coupon.id
        })

        info.message = 'Cupom aplicado com sucesso'
        info.success = true
      } else {
        info.message = 'Não foi possível aplicar este cupom'
        info.success = false
      }

      order = await transform
        .include('user,items,discounts,coupons')
        .item(order, OrderTransformer)

      return response.send({ order, info })
    } catch (error) {
      return response.status(400).send({ message: info.message })
    }
  }

  async removeDiscount({ params: { id }, request, response }) {
    const { discount_id } = request.all()
    const discount = await Discount.findOrFail(discount_id)

    await discount.delete()

    return response.status(204).send()
  }
}

module.exports = OrderController
