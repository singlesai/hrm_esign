var Core = require('./core')

class Template {
    constructor(company) {
        this.core = new Core(company)
    }
    
    async templates(page, pageSize) {
        page = page || 1
        pageSize = pageSize || 10
        return await this.core.get(`/v3/doc-templates?pageNum=${page}&pageSize=${pageSize}`)
    }

    async flowTemplates(page, pageSize) {
        page = page || 1
        pageSize = pageSize || 10
        return await this.core.get(`/v3/flow-templates/basic-info?pageNum=${page}&pageSize=${pageSize}`)
    }

    async flowTemplate(id) {
        //return await this.core.get(`/v1/docTemplates/${id}`)
        return await this.core.get(`/v3/doc-templates/${id}`)
    }

    async flowTemplateBaseInfo(id) {
        return await this.core.get(`/v1/docTemplates/${id}/getBaseInfo`)
    }

    async createFileByTemplate(id, name, val) {
        // return await this.core.post('/v1/files/createByTemplate', {name: name, simpleFormFields: val, templateId: id})
        return await this.core.post('/v3/files/create-by-doc-template', {docTemplateId: id, fileName: name, components: val})
    }
}
module.exports = Template