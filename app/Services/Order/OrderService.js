'use strict'

const Database = use('Database')

class OderService {
  constructor(model, trx = false) {
    this.model = model
    this.trx = trx
  }

  async syncItems(items) {
    if (!Array.isArray(items)) return false

    await this.model.items().delete(this.trx)
    await this.model.items().createMany(items, this.trx)
  }

  async updateItems(items) {
    let currentItems = await this.model
      .items()
      .whereIn('id', items.map(item => item.id))
      .fetch()

    await this.model
      .items()
      .whereNotIn('id', items.map(item => item.id))
      .delete(this.trx)

    await Promise.all(currentItems.rows.map(async item => {
      item.fill(items.find(n => n.id === item.id))
      await item.save(this.trx)
    }))
  }

  async canApplyDiscount(coupon) {
    const couponProducts = await Database
      .from('coupon_products')
      .where('coupon_id', coupon.id)
      .pluck('product_id') // Retorna apenas os id's sem a chave product_id

    const couponCustomers = await Database
      .from('coupon_users')
      .where('coupon_id', coupon.id)
      .pluck('user_id')

    // Caso o cupom não esteja associado a nenhum produto e cliente específicos
    // ele é livre para ser utilizado
    if (
      Array.isArray(couponProducts) &&
      couponProducts.length < 1 &&
      Array.isArray(couponCustomers) &&
      couponCustomers.length < 1
    ) return true

    let isAssociatedToProducts = false
    let isAssociatedToCustomers = false

    if (Array.isArray(couponProducts) && couponProducts.length < 1 ) {
      isAssociatedToProducts = true
    }

    if (Array.isArray(couponCustomers) && couponCustomers.length < 1 ) {
      isAssociatedToCustomers = true
    }

    // Quais produtos o cliente tem direito a desconto com este cupom
    const productsMatch = await Database
      .from('order_items')
      .where('oder_id', this.model.id)
      .whereIn('product_id', couponProducts)
      .pluck('product_id')

    // O cupom está associado a clientes e produtos
    if(isAssociatedToCustomers && isAssociatedToProducts) {
      const customerMatch = couponCustomers.find(
        customer => customer === this.model.user_id
      )

      if (
        customerMatch &&
        Array.isArray(productsMatch) &&
        productsMatch > 0
      ) return true
    }

    // O cupom está associado apenas a produto
    if(
      isAssociatedToProducts &&
      Array.isArray(productsMatch) &&
      productsMatch.length > 0
    ) return true

    // O cupom está associado a um ou mais clientes (e nenhum produto)
    if(
      isAssociatedToCustomers &&
      Array.isArray(couponCustomers) &&
      couponCustomers.length > 0
    ) {
      const match = couponCustomers.find(customer => customer === user.model.user_id)
      if (match) return true
    }

    // Caso não bata com nenhuma condição anterior, o desconto não é válido
    return false
  }
}

module.exports = OderService
