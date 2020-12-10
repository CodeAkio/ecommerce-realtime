'use strict'

const Copon = use('App/Models/Coupon')
const Order = use('App/Models/Order')
const Database = use('Database')

const DiscountHook = exports = module.exports = {}

DiscountHook.calculateValues = async (model) => {
  let couponProducts = []
  let discountItems = []
  model.discount = 0

  const coupon = await coupon.find(model.coupon_id)
  const order = await order.find(model.order_id)

  switch (coupon.can_use_for) {
    case 'product_client' || 'product':
      couponProducts = await Database
        .from('coupon_product')
        .where('coupon_id', model.coupon_id)
        .pluck('product_id')

      discountItems = await Database
        .from('order_items')
        .whereIn('order_id', couponProducts)

      if (coupon.type === 'percent') {
        for (let orderItem of discountItems) {
          model.discount += (orderItem.subtotal / 100) * coupon.discount
        }
      } else if (coupon.type === 'currency') {
        for (let orderItem of discountItems) {
          model.discount += coupon.discount * orderItem.quantity
        }
      } else {
        for (let orderItem of discountItems) {
          model.discount += orderItem.subtotal
        }
      }
      break;

    default:
      // cupom para cliente ou livre
      if (coupon.type === 'percent') {
        model.discount = (orderItem.subtotal / 100) * coupon.discount
      } else if (coupon.type === 'currency') {
        model.discount = coupon.discount
      } else {
        model.discount = coupon.subtotal
      }

      break;
  }
}

DiscountHook.decrementCoupons = async (model) => {
  const query = Database.from('coupons')

  // Verifica se existe uma trx criada no controller,
  // caso exista passa para a query
  if (model.$transaction) {
    query.transactiong(model.$transaction)
  }

  await query.where('id', model.coupon_id).decrement('quantity', 1)
}

DiscountHook.incrementCoupons = async (model) => {
  const query = Database.from('coupons')

  if (model.$transaction) {
    query.transactiong(model.$transaction)
  }

  await query.where('id', model.coupon_id).increment('quantity', 1)
}
