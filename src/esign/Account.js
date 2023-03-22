var Core = require('./core')

class Account {
    constructor(company) {
        this.core = new Core(company)
    }
    // thirdPartyUserId, name, idType, idNumber, mobile, email
    static async createAcount(data) {
        return this.core.post('/v1/accounts/createByThirdPartyUserId', data)
    }
    static async updateAccount(thirdPartyUserId, data) {
        return this.core.put('/v1/accounts/'+thirdPartyUserId, data)
    }
    static async deleteAccount(id) {
        return this.core.delete('/v1/accounts/'+thirdPartyUserId)
    }
}
module.exports = Account