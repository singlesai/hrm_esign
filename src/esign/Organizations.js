var Core = require('./core')

class Organizations {
    constructor(company) {
        this.core = new Core(company)
    }
    async administrators(orgid) {
        return await this.core.get(`/v3/organizations/${orgid}/administrators`)
    }
    async memberList(orgid, page, pageSize) {
        page = page || 1
        pageSize = pageSize || 10
        return await this.core.get(`/v3/organizations/${orgid}/member-list?pageNum=${page}&pageSize=${pageSize}`)
    }
    /*
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
    */
}
module.exports = Organizations