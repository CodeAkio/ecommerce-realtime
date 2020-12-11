const { ServiceProvider } = require('@adonisjs/fold');

class ExistsRuleProvider extends ServiceProvider {
  /**
   * Register namespaces to the IoC container
   *
   * @method existsFn
   * @param data - Todos os dados da request
   * @param field - Campo a ser validado
   * @param message - Mensagem de validação
   * @param args - Argumentos passado pelo módulo rule de validator
   * @param get - Método para pegar campos específicos de dentro do data
   * @return {void}
   */
  async existsFn(data, field, message, args, get) {
    const Database = use('Database');

    const value = get(data, field);
    if (!value) return;

    const [table, column] = args;

    const row = await Database.table(table).where(column, value).first();
    if (!row) {
      throw message;
    }
  }

  /**
   * Attach context getter when all providers have
   * been registered
   *
   * @method boot
   *
   * @return {void}
   */
  boot() {
    const Validator = use('Validator');
    Validator.extend('exists', this.existsFn.bind(this));
  }
}

module.exports = ExistsRuleProvider;
