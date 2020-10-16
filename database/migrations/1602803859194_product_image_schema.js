'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ProductImageSchema extends Schema {
  up () {
    this.create('product_images', (table) => {
      table.increments()
      table.integer('image_id').unsigned()
      table.integer('product_id').unsigned()
      table.timestamps()

      table
        .foreign('image_id')
        .references('id')
        .inTable('images')
        .onDelete('CASCADE')

      table
        .foreign('product_id')
        .references('id')
        .inTable('products')
        .onDelete('CASCADE')
    })
  }

  down () {
    this.drop('product_images')
  }
}

module.exports = ProductImageSchema
