'use strict'

const crypto = use('crypto')
const Helpers = use('Helpers')

/**
 * Generate random string
 *
 * @param { int } length - O tamanho da string que você quer gerar
 * @return { string } Uma string randomica com o tamanho do length
 */
const str_random = async (length = 40) => {
  let string = ""
  let len = string.length

  if (len < length) {
    let size = length - len
    let bytes = await crypto.randomBytes(size)
    let buffer = Buffer.from(bytes)
    string += buffer
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, "")
      .substr(0, size)
  }

  return string
}

/**
 * Move um único arquivo para o caminho especificado, se nenhum for especificado
 * então 'public/uploads' será utilizado.
 *
 * @param { FileJar } file - O arquivo a ser gerenciado
 * @param { string } path - O caminho para onde o arquivo deve ser movido
 * @return { string } - Retorna o arquivo no destino final
 */
const manage_single_upload = async (file, path = null) => {
  path = path ? path : Helpers.publicPath('uploads')

  // Gera nome aleatório
  const random_name = await str_random(30)
  let filename = `${new Date().getTime()}-${random_name}.${file.subtype}`

  // Renomeia arquivo
  await file.move(path, {
    name: filename
  })

  return file
}

module.exports = {
  str_random
}
