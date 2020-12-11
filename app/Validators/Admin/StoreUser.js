'use strict'

class StoreUser {
  get rules () {
    const userId = this.ctx.params.id
    const rule = userId
      ? `unique:users,email,id,${userId}`
      : 'unique:users,email|required'

    return {
      email: rule,
      image_id: 'exists:images,id'
    }
  }
}

module.exports = StoreUser
