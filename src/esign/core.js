const cfg = require('../../config.json')
const axios = require('axios')
const cryptoJs = require('crypto-js')
const Pub = require('../public')

class Core {
    constructor(company) {
        this._company = company
        this._cfg = cfg.esign[cfg.mode]
        this.url = this._cfg.url
    }

    async init() {
        if (!this._apiParams) {
            this._apiParams = await Pub.company(this._company)
        }
    }

    async getHeader(method, url, body) {
        await this.init()
        method = method.toUpperCase()
        switch(method) {
            case 'GET':
            case 'DELETE':
                var body = null
                var contentMD5=''
                break
            case 'PUT':
            case 'POST':
                var strBody = JSON.stringify(body)
                // console.log('md5', strBody)
                contentMD5 = cryptoJs.MD5(strBody)
                contentMD5 = cryptoJs.enc.Base64.stringify(contentMD5)
                
                break
            default:
                throw('不支持的请求方法'+method)
                break
        }
        var header = {
            "X-Tsign-Open-App-Id": this._apiParams.appId,
            "X-Tsign-Open-Ca-Timestamp": Number(new Date()),
            "Accept": "*/*",
            "Content-MD5": contentMD5,
            "Content-Type": "application/json; charset=UTF-8",
            "X-Tsign-Open-Auth-Mode": 'Signature'
        }
        var msg = `${method}\n${header['Accept']}\n${header['Content-MD5']}\n${header['Content-Type']}\n\n${url}`
        // console.log('msg',msg)
        msg = cryptoJs.HmacSHA256(msg, this._apiParams.secret)
        // console.log('msg sha',msg)
        msg = cryptoJs.enc.Base64.stringify(msg)
        // console.log('msg encode',msg)
        header['X-Tsign-Open-Ca-Signature'] = msg
        return header
        /*
        */
    }

    async get(path) {
        var url = this.url + path
        var header = await this.getHeader('get', path)
        // console.log('ur', header, url)
        var rst = await axios({
            method: 'get',
            url,
            headers: header
        })
        if (rst.status!==200) {
            throw(rst.statusText)
        }
        rst = rst.data
        if (rst.code!==0) {
            throw(rst.message)
        }
        rst = rst.data
        return rst
    }

    async post(path, data) {
        var url = this.url + path
        var header = await this.getHeader('post', path, data)
        // console.log('post', header)
        var rst = await axios({
            method: 'post',
            url,
            headers: header,
            data
        })
        if (rst.status!==200) {
            throw(rst.statusText)
        }
        rst = rst.data
        if (rst.code!==0) {
            console.log('post err:', rst)
            throw(rst.message)
        }
        rst = rst.data
        return rst
    }

    async put(path, data) {
        var url = this.url + path
        var header = await this.getHeader('put', path, data)
        return await axios({
            method: 'put',
            url,
            headers: header,
            data
        })
    }

    async delete(path) {
        var url = this.url + path
        var header = await this.getHeader('delete', path, data)
        return await axios({
            method: 'delete',
            url,
            headers: header
        })
    }
}
module.exports = Core