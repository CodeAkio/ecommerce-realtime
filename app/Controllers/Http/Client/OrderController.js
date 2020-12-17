'use strict'

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

const Database = use('Database')
const Order = use('App/Models/Order')
const Coupon = use('App/Models/Coupon')
const Discount = use('App/Models/Discount')
const OrderTransformer = use('App/Transformers/Admin/OrderTransformer')
const OrderService = use('App/Services/Order/OrderService')
const Ws = use('Ws')

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
   * @param {View} ctx.view
   */
  async index ({ request, response, auth, transform, pagination }) {
    const client = await auth.getUser()
    const orderNumber = request.input('number')

    const query = Order.query()

    if (orderNumber) query.where('id', 'ilike', `%${orderNumber}%`)

    query.where('user_id', client.id)

    const results = await query
      .orderBy('id', 'desc')
      .paginate(pagination.page, pagination.limit)

    const orders = await transform.paginate(results, OrderTransformer)

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
  async store ({ request, response, auth, transform }) {
    const trx = await Database.beginTransaction()
    const items = request.input('items')
    const client = await auth.getUser()

    try {
      let order = await Order.create({ user_id: client.id }, trx)
      const orderService = new OrderService(order, trx)

      if (items.length > 0) await orderService.syncItems(items)

      await trx.commit()

      order = await Order.find(order.id)
      order = await transform.include('items').item(order, OrderTransformer)

      const topic = Ws.getChannel('notifications').topic('notifications')
      if (topic) topic.broadcast('new:order', order)

      return response.status(201).send(order)
    } catch (error) {
      await trx.rollback()

      return response.status(400).send({
        message: "Não foi possível criar o pedido!"
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
  async show ({ params: { id }, request, response, auth, transform }) {
    const client = await auth.getUser()
    const result = await Order
      .query()
      .where('user_id', client.id)
      .where('id', id)
      .firstOrFail()

    const order = await transform.item(result, OrderTransformer)

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
  async update ({ params: { id }, request, response, auth, transform }) {
    const { items, status } = request.all()
    const client = await auth.getUser()

    let order = await Order
      .query()
      .where('user_id', client.id)
      .where('id', id)
      .firstOrFail()

    const trx = await Database.beginTransaction()

    try {
      order.merge({ user_id: client.id, items, status })

      const orderService = new OrderService(order, trx)
      await orderService.updateItems(items)

      await order.save(trx)
      await trx.commit()

      order = await transform
        .include('items,coupons,discounts')
        .item(order, OrderTransformer)

      return response.send(order)
    } catch (error) {
      await trx.rollback()

      return response.status(400).send({
        message: "Não foi possível atualizar o pedido!"
      })
    }
  }

  async applyDiscount ({ params: { id }, request, response, auth, transform }) {
    const { code } = request.all()
    const client = await auth.getUser()
    const coupon = Coupon.findOrFail('code', code.toUpperCase())
    let order = Order
      .query()
      .where('user_id', client.id)
      .where('id', id)
      .firstOrFail()

    let discount = {}
    let info = {}

    try {
      const orderService = new OrderService(order)
      const canAddDiscount = await orderService.canAddDiscount(coupon)
      const orderDiscounts = await order.coupons().getCount()

      const canApplyToOrder = orderDiscounts < 1 || (orderDiscounts >= 1 && coupon.recursive)

      if (canAddDiscount && canApplyToOrder) {
        discount = await Discount.findOrCreate({
          order_id: order.id,
          coupon_id: coupon.id
        })

        info.message = "Cupom aplicado com sucesso!"
        info.success = true
      } else {
        info.message = "Não foi possível aplicar o desconto"
        info.success = false
      }

      order = await transform
        .include('coupons,items,discounts')
        .item(order, OrderTransformer)

      return response.send({ order, info })
    } catch (error) {
      return response.status(400).send({
        message: "Erro desconhecido"
      })
    }
  }

  async removeDiscount ({ params: { id }, request, response, auth }) {
    const { discount_id } = request.all()
    const discount = await Discount.findOrFail(discount_id)

    await discount.delete()

    return response.status(204).send()
  }
}

module.exports = OrderController
