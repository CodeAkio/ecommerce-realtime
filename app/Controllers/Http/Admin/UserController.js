'use strict'

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */
const User = use('App/Models/User')
const UserTransformer = use('App/Transformers/Admin/UserTransformer')

/**
 * Resourceful controller for interacting with users
 */
class UserController {
  /**
   * Show a list of all users.
   * GET users
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {object} ctx.pagination
   */
  async index ({ request, response, pagination, transform }) {
    const name = request.input('name')

    const query = User.query()

    if (name) {
      query.where('name', 'ilike', `%${name}%`)
      query.orWhere('surname', 'ilike', `%${name}%`)
      query.orWhere('email', 'ilike', `%${name}%`)
    }

    let users = await query.paginate(pagination.page, pagination.limit)
    users = await transform.paginate(users, UserTransformer)

    return response.send(users)
  }

  /**
   * Create/save a new user.
   * POST users
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store ({ request, response, transform }) {
    try {
      const userData = request.only([
        'name',
        'surname',
        'email',
        'password',
        'image_id'
      ])

      let user = await User.create(userData)
      user = await transform.item(user, UserTransformer)

      return response.status(201).send(user)
    } catch (error) {
      return response.status(400).send({
        message: "Erro ao criar o usuário!"
      })
    }
  }

  /**
   * Display a single user.
   * GET users/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async show ({ params: { id }, request, response, transform }) {
    let user = await User.findOrFail(id)
    user = await transform.item(user, UserTransformer)

    return response.send(user)
  }

  /**
   * Update user details.
   * PUT or PATCH users/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async update ({ params: { id }, request, response, transform }) {
    let user = await User.findOrFail(id)

    try {
      const userData = request.only([
        'name',
        'surname',
        'email',
        'password',
        'image_id'
      ])

      user.merge(userData)
      await user.save()
      user = await transform.item(user, UserTransformer)

      return response.send(user)
    } catch (error) {
      return response.status(400).send({
        message: "Erro ao atualizar o usuário!"
      })
    }
  }

  /**
   * Delete a user with id.
   * DELETE users/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroy ({ params: { id }, request, response }) {
    const user = await User.findOrFail(id)

    try {
      await user.delete()

      return response.status(204).send()
    } catch (error) {
      return response.status(500).send({
        message: "Erro ao deletar o usuário!"
      })
    }
  }
}

module.exports = UserController
