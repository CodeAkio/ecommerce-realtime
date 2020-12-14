'use strict'

const BumblebeeTransformer = use('Bumblebee/Transformer')
const ImageTransformer = use('App/Transformers/Admin/Image')

/**
 * UserTransformer class
 *
 * @class UserTransformer
 * @constructor
 */
class UserTransformer extends BumblebeeTransformer {
  static get defaultInclude() {
    return ['image']
  }

  transform (model) {
    return {
     id: model.id,
     name: model.name,
     surname: model.surname,
     email: model.email
    }
  }

  includeImage(model) {
    return this.item(model.getRelated('image'), ImageTransformer)
  }
}

module.exports = UserTransformer
