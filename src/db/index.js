// const Sqlite = require("./sqlite")
const Mssql = require("./mssql")
// const Pg = require("./pg")
// const RemoteDB = require('./srv')

class Database{
    constructor(type, cfg, dbSrv){
        this._type = type
        this._cfg = cfg
        if(dbSrv){
            this._dbSrv = dbSrv
            this._db = new RemoteDB(dbSrv, type, cfg)
        }else{
            switch(type){
                case "sqlite":
                    //this._db = new Sqlite(cfg)
                    break
                case "sqlserver":
                case "mssql":
                    this._db = new Mssql(cfg)
                    break
                case "pgsql":
                case "postgresql":
                case "pg":
                    //this._db = new Pg(cfg)
                    break
                case "oracle":
                    break
                case "mysql":
                    break
                default:
                    throw('Not Support Database')
                    break
            }
        }
        this.tranLevel = 0
    }

    async beginTran(env) {
        if(this.tranLevel===0){
            return await this._db.begTran(env)
        }
        //this.tranLevel += 1
    }

    async endTran(env) {
        //this.tranLevel -= 1
        if(this.tranLevel === 0){
            return await this._db.endTran(env)
        }
    }

    async exitTran(env) {
        this.tranLevel = 0
        return await this._db.exitTran(env)
    }

    async excSql(env,strSql){
        return await this._db.excSql(env, strSql)
    }

    async getData(env,strSql){
        return await this._db.getData(env, strSql)
    }

    async tableInfo(env,table){
        return await this._db.tableInfo(env, table)
    }

    async addField(env,table, fields){
        return await this._db.addField(env, table,fields)
    }

    async dropField(env,table, fields) {
        return await this._db.dropField(env, table, fields)
    }

    async query(env,table, filter, fields, orders, limit, offset) {
        return await this._db.query(env, table, filter,fields, orders, limit, offset)
    }

    async count(env,table, filter) {
        return await this._db.count(env, table, filter)
    }

    async create(env,table, val) {
        return await this._db.create(env, table, val)
    }

    async write(env,table, filter, val) {
        return await this._db.write(env, table, filter, val)
    }

    async delete(env,table, filter) {
        return await this._db.delete(env, table, filter)
    }
}
module.exports = Database
