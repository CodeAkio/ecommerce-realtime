'use strict'

const BumblebeeTransformer = use('Bumblebee/Transformer')
const ImageTransformer = use('App/Transformers/Admin/Image')
/**
 * CategoryTransformer class
 *
 * @class CategoryTransformer
 * @constructor
 */
class CategoryTransformer extends BumblebeeTransformer {
  static get defaultInclude() {
    return ['image']
  }

  transform (model) {
    return {
     id: model.id,
     title: model.title,
     description: model.description
    }
  }

  includeImage(model) {
    return this.item(model.getRelated('image'), ImageTransformer)
  }
}

module.exports = CategoryTransformer
