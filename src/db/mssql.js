var mssql = require('mssql');
var moment = require('moment')
var cfg = require('../../config.json')

class Mssql{
    constructor(conn) {
        this._cfg = cfg.hrm[cfg.mode]
        this._conn = conn || this._cfg.db
        // this._conn = JSON.parse(conn)
        this._hostname = this._conn.hostname || '127.0.0.1';
        this._port = this._conn.port || 1433;
        this._port = Number(this._port)
        this._user = this._conn.user || 'sa';
        this._password = this._conn.password || '';
        this._database = this._conn.database;
        this._db = new mssql.ConnectionPool({
            server: this._hostname,
            port: this._port,
            user: this._user,
            password: this._password,
            database: this._database,
            options: {
                encrypt: false
            }
        })
        this._connecting = false
        this._inTran = false
        this._tran = undefined
        this._req = undefined
    }

    async init(env) {
        if (!this._connecting) {
            await this._db.connect()
        }
    }

    async begTran(env) {
        await this.init(env)
        if(!this._inTran) {
            this._inTran = true
            this._tran = new mssql.Transaction(this._db)
            await this._tran.begin()
            this._req = new mssql.Request(this._tran)
        }
    }

    async endTran(env) {
        await this.init(env)
        if(this._inTran) {
            await this._tran.commit()
            this._inTran = false
            this._tran = undefined
        }
    }

    async exitTran(env) {
        await this.init(env)
        if(this._inTran){
            await this._tran.rollback()
            this._inTran = false
            this._tran = undefined
        }
    }

    async excSql(env, strSql){
        try{
            if(!strSql){
                throw('sql sentence is null')
            }
            if(this._cfg.log.db.exec) {
                console.log('exec Sql', strSql)
            }
            await this.init(env)
            if(this._inTran){
                return await this._req.query(strSql)
            }else{
                return await this._db.query(strSql)
            }
        }catch(ex){
                console.log('execSql Err:', strSql)
            throw(ex)
        }
    }

    async getData(env, strSql) {
        try{
            if(!strSql){
                throw('sql sentence is null')
            }
            if(this._cfg.log.db.exec) {
                console.log('getData Sql', strSql)
            }
            await this.init(env)
            var rst = await this._db.query(strSql)
            return rst
        }catch(ex){
                console.log('getData Err:', strSql)
            throw(ex)
        }
    }

    async tableInfo(env, tableName) {
        if(!this._tables){
            this._tables = {}
        }
        if(!this._tables[tableName]){
            var strSql = `select j.name,k.name [type],j.[length]
            from sysobjects i join syscolumns j on j.id=i.id join systypes k on k.xtype=j.xtype
            where i.name='`+tableName+`'`
            var rst = await this.getData(env, strSql)
            rst = rst.recordset
            if(rst.length<=0){
                return 
            }
            this._tables[tableName] = {name: tableName}
        }
        if(!this._tables[tableName]['fields']){
            this._tables[tableName]['fields']={}
            if(!rst){
                strSql = `select j.name,k.name [type],j.[length]
                from sysobjects i join syscolumns j on j.id=i.id join systypes k on k.xtype=j.xtype
                where i.name='`+tableName+`'`
                rst = await this.getData(env, strSql)
                rst = rst.recordset
            }
            for(var idx in rst){
                this._tables[tableName]['fields'][rst[idx].name] = rst[idx]
            }
        }
        return this._tables[tableName]
    }

    async addField(env, tableName, fields) {
        if(!fields) return
        var rst = await this.getData(env, "select name from sysobjects where type='u' and name='"+tableName+"' order by name")
        rst = rst.recordset
        var strSql, strArr = [], strTmp
        if(rst.length<=0){
            for(var idx in fields){
                var field = fields[idx]
                strTmp = field.name + ' '
                switch(field.type) {
                    case "img":
                    case "file":
                    case "selection":
                    case "guid":
                    case "string":
                    case "billno":
                    case "text":
                        if(!field.length){
                            field.length = 50
                        }
                        strTmp += 'varchar('+field.length+')'
                        break
                    case "code":
                    case "vuecode":
                        if(!field.length){
                            field.length = 1000
                        }
                        strTmp += 'varchar('+field.length+')'
                        break
                    case "datetime":
                        strTmp+="datetime"
                        break
                    case "date":
                        strTmp+="datetime"
                        break
                    case "double":
                        strTmp+="decimal(28,10)"
                        break
                    case "int":
                    case "m2o":
                        strTmp+="int"
                        break
                    case "bool":
                        strTmp+="bit"
                        break
                    case "auto":
                        strTmp+=' int identity(1,1)'
                        break
                    default:
                        throw 'Not Support Type:'+field.type
                        break
                }
                strArr.push(strTmp)
            }
            strSql="create table "+tableName+"("+strArr.join(',')+")"
        }else{
            var ti = await this.tableInfo(env, tableName)
            for(var idx in fields){
                var field = fields[idx]
                strTmp = field.name + ' '
                switch(field.type) {
                    case "img":
                    case "file":
                    case "selection":
                    case "guid":
                    case "billno":
                    case "string":
                        if(!field.length){
                            field.length = 50
                        }
                        strTmp += 'varchar('+field.length+')'
                        break
                    case "datetime":
                        strTmp+="datetime"
                        break
                    case "date":
                        strTmp+="datetime"
                        break
                    case "double":
                        strTmp+="decimal(28,10)"
                        break
                    case "int":
                    case "m2o":
                        strTmp+="int"
                        break
                    case "bool":
                        strTmp+="bit"
                        break
                    case "auto":
                        strTmp+=' int identity(1,1)'
                        break
                    default:
                        throw 'Not Support Type:'+field.type
                        break
                }
                if(ti === undefined || ti.fields[field.name] === undefined) {
                    strArr.push("alter table "+tableName+" add "+strTmp+" ")
                }
            }
            if(strArr.length>0){
                strSql = strArr.join('')
            }
        }
        if(strSql!==undefined){
            await this.excSql(env, strSql)
            if(this._tables === undefined){
                this._tables = {}
            }
            this._tables[tableName] = undefined
        }
    }

    async dropField(env, tableName, fields) {
        var tableInfo = await this.tableInfo(env, tableName)
        var tmpArr=[]
        for(var idx in fields){
            var field=fields[idx]
            if(tableInfo.fields[field]!==undefined){
                tmpArr.push(field)
            }
        }
        var strSql = "alter table "+tableName+" drop column "+tmpArr.join(',')
        await this.excSql(env, strSql)
        if(this._tables === undefined){
            this._tables = {}
        }
        this._tables[tableName] = undefined
    }

    filterStr(tableInfo, filter){
        if(!filter) return ""
        if(!filter.op) return ''
        var idx=undefined, arrTmp=[], childFilter = undefined, strWhere = undefined
        var op = filter.op
        switch(filter.op)
        {
            case "&":
                strWhere = " and "
                for(idx in filter.child) {
                    childFilter = filter.child[idx]
                    arrTmp.push("("+this.filterStr(tableInfo, childFilter)+")")
                }
                strWhere = arrTmp.join(strWhere)
                break
            case "|":
                strWhere = " or "
                for(idx in filter.child) {
                    childFilter = filter.child[idx]
                    arrTmp.push("("+this.filterStr(tableInfo, childFilter)+")")
                }
                strWhere = arrTmp.join(strWhere)
                break
            case "=":
            case "!=":
            case ">":
            case ">=":
            case "<":
            case "<=":
            case "like":
            case "!like":
                op = op==='!like'?'not like':op
                var lVal = filter.lVal,rVal=filter.rVal,lField=undefined,rField=undefined
                if(lVal.type === 'prop'){
                    lField = lVal.value
                    if(!tableInfo.fields[lField]){
                        throw "Table '"+tableInfo.name+" Not Exists Field '"+lField+"'"
                    }
                }
                if(rVal.type === 'prop'){
                    rField = rVal.value
                    if(!tableInfo.fields[rField]){
                        throw "Table '"+tableInfo.name+" Not Exists Field '"+rField+"'"
                    }
                }
                if(lField && rField){
                    strWhere=lField+' '+op+' '+rField
                }else{
                    if(lField){
                        if (rVal.value === null) {
                            if (op === '=') {
                                strWhere = lField + ' is null'
                            }
                            if (op === '!=') {
                                strWhere = lField + ' is not null'
                            }
                        } else {
                            strWhere=lField+' '+op+' '
                            switch(tableInfo.fields[lField].type){
                                case "int": 
                                case "double":
                                    strWhere+=rVal.value
                                    break
                                case "date":
                                    var value = rVal.value
                                    if(moment.isDate(value)){
                                        value = moment(value).format('YYYY-MM-DD')
                                    }else{
                                        value = value.replace('T', ' ')
                                        value = value.replace('Z','')
                                    }
                                    strWhere+="'"+value+"'"
                                    break
                                case "datetime":
                                    var value = rVal.value
                                    if(moment.isDate(value)){
                                        value = moment(value).format('YYYY-MM-DD HH:mm:ss')
                                    }else{
                                        value = value.replace('T', ' ')
                                        value = value.replace('Z','')
                                    }
                                    strWhere+="'"+value+"'"
                                    break
                                default:
                                    if(typeof rVal.value === 'string'){
                                        strWhere+="'"+rVal.value.replace(/'/g,`''`)+"'"
                                    }else{
                                        strWhere+="'"+rVal.value+"'"
                                    }
                                    break
                            }
                        }
                    }
                    if(rField){
                        strWhere=op+' '+rField
                        switch(tableInfo.fields[rField].type) {
                            case "int":
                            case "double":
                                strWhere=lVal.value+strWhere
                                break
                            case "date":
                                var value = lVal.value
                                if(moment.isDate(value)){
                                    value = moment(value).format('YYYY-MM-DD')
                                }else{
                                    value = value.replace('T', ' ')
                                    value = value.replace('Z','')
                                }
                                strWhere="'"+value+"'"+strWhere
                                break
                            case "datetime":
                                var value = lVal.value
                                if(moment.isDate(value)){
                                    value = moment(value).format('YYYY-MM-DD HH:mm:ss')
                                }else{
                                    value = value.replace('T', ' ')
                                    value = value.replace('Z','')
                                }
                                strWhere="'"+value+"'"+strWhere
                                break
                            default:
                                if(typeof rVal.value === 'string'){
                                    strWhere="'"+lVal.value.replace(/'/g,`''`)+"'"+strWhere
                                }else{
                                    strWhere="'"+lVal.value+"'"+strWhere
                                }
                                break
                        }
                    }
                    if(lField===undefined && rField===undefined){
                        strWhere = lVal.value+' '+op+' '+rVal.value
                    }
                }
                break
            case "in":
                var lVal = filter.lVal,rVal=filter.rVal,lField=undefined,rField=undefined
                if(lVal.type === 'prop'){
                    lField = lVal.value
                    if(!tableInfo.fields[lField]){
                        throw "Table '"+tableInfo.name+" Not Exists Field '"+lField+"'"
                    }
                }
                if(rVal.type === 'prop'){
                    rField = rVal.value
                    if(!tableInfo.fields[rField]){
                        throw "Table '"+tableInfo.name+" Not Exists Field '"+rField+"'"
                    }
                }
                if(lField && rField){
                    strWhere=lField+' '+op+' '+rField
                }else{
                    if(lField){
                        strWhere=lField+' '+op+' '
                        switch(tableInfo.fields[lField].type){
                            case "int": 
                            case "double":
                                strWhere+='('+rVal.value.join(',')+')'
                                break
                            default:
                                strWhere+="('"+rVal.value.join("','")+"')"
                                break
                        }
                    }
                    if(rField){
                        strWhere=op+' '+rField
                        switch(tableInfo.fields[rField].type) {
                            case "int":
                            case "double":
                                strWhere='('+lVal.value.join(',')+')'+strWhere
                                break
                            default:
                                strWhere="('"+lVal.value.join("','")+"')"+strWhere
                                break
                        }
                    }
                    if(lField===undefined && rField===undefined){
                        strWhere = lVal.value+' '+op+' '+rVal.value
                    }
                }
                break
            default:
                throw "Filter Err:"+JSON.stringify(filter)
                break
        }
        return strWhere
    }
    
    async count(env, table, filter) {
        var tableInfo = await this.tableInfo(env, table)
        var strSql = "select count(*) cnt from "+table
        var strWhere = this.filterStr(tableInfo, filter)
        if(strWhere) {
            strSql += " where " + strWhere
        }
        var rst = await this.getData(env, strSql)
        rst = rst.recordset
        return rst[0]['cnt']
    }

    
    async query(env, table, filter, fields, order, limit, offset) {
        var tableInfo = await this.tableInfo(env, table)
        var nOrder=[]
        if(order){
            for(field in order){
                if(tableInfo.fields[field]){
                    nOrder.push(field+" "+order[field])
                }
            }
        }

        var nFields = []
        var field
        if(fields){
            for(field in fields){
                if(tableInfo.fields[fields[field]]) {
                    nFields.push(fields[field])
                }
            }
        }else{
            for(field in tableInfo.fields){
                nFields.push(field)
            }
        }
        if (nFields.length === 0) {
            nFields = ['*']
        }
        var strWhere = this.filterStr(tableInfo, filter)

        var strSql
        if(offset){
            if(nOrder.length<=0){
                for(field in tableInfo.fields){
                    if(nOrder.length<=0){
                        nOrder.push(field+' asc')
                    }
                }
            }
            if(limit){
                strSql = `select top `+limit+` * from (select row_number() over(order by `+nOrder.join(',')+`) as rownumber,`+nFields.join(',')+` from `+table+(strWhere?' where '+strWhere:'')+`) i where rownumber>`+offset
            }else{
                strSql = `select * from (select row_number() over(order by `+nOrder.join(',')+`) as rownumber,`+nFields.join(',')+` from `+table+(strWhere?' where '+strWhere:'')+`) i where rownumber>`+offset
            }
        }else{
            if(limit){
                strSql = `select top `+limit+` `+nFields.join(",")+` from `+table+``+(strWhere?' where '+strWhere:'')+(nOrder.length>0?' order by '+nOrder.join(','):'')
            }else{
                strSql = `select `+nFields.join(",")+` from `+table+``+(strWhere?' where '+strWhere:'')+(nOrder.length>0?' order by '+nOrder.join(','):'')
            }
        }
        var rst = await this.getData(env, strSql)
        return rst.recordset
    }
    /*
    async query(table, filter, fields, order, limit, offset) {
        var tableInfo = await this.tableInfo(table)
        var nFields = []
        var field
        if(fields){
            for(field in fields){
                if(tableInfo.fields[fields[field]]) {
                    nFields.push(fields[field])
                }
            }
        }else{
            for(field in tableInfo.fields){
                nFields.push(field)
            }
        }
        if (nFields.length === 0) {
            nFields = ['*']
        }
        var strSql = nFields.join(",") + " from "+table
        //console.log(tableInfo, filter)
        var strWhere = this.filterStr(tableInfo, filter)
        if(strWhere) {
            strSql += " where "+strWhere
        }

        var nOrder=[]
        if(order){
            for(field in order){
                if(tableInfo.fields[field]){
                    nOrder.push(field+" "+order[field])
                }
            }
            if(nOrder.length>0){
                strSql+=" order by "+nOrder.join(',')
            }
        }
        if(!limit && !offset){
            strSql = 'select ' + strSql
        }
        if(limit && !offset){
            strSql = 'select top '+limit+' '+strSql
        }
        if(!limit && offset){
            strSql = 'select * from (select ROW_NUMBER() OVER(Order by '+nOrder.join(',')+') as RowNumber,'+strSql+') where RowNumber>'+offset+' order by '+nOrder.join(',')
        }
        if(limit && offset){
            strSql = 'select * from (select ROW_NUMBER() OVER(Order by '+nOrder.join(',')+') as RowNumber,'+strSql+') where RowNumber between '+offset+' and '+(offset+limit)+' order by '+nOrder.join(',')
        }
        //if(limit) {
        //    strSql += " limit " + limit
        //}

        //if(offset) {
        //    strSql += " offset " + offset
        //}
        var rst = await this.getData(strSql)
        rst = rst.recordset
        return rst
    }
    */

    async create(env, table, val) {
        var tableInfo = await this.tableInfo(env, table)
        var strSql, arrField=[], arrValue =[]
        for(var field in val){
            if(!tableInfo.fields[field]){
                continue
            }
            arrField.push(field)
            switch(tableInfo.fields[field].type){
                case "int":
                case "double":
                case "bit":
                    arrValue.push(val[field])
                    break
                case "bool":
                    arrValue.push(val[field])
                    break
                case "date":
                    var value = val[field]
                    if(moment.isDate(value)){
                        value = moment(value).format('YYYY-MM-DD')
                    }else{
                        value = value.replace('T', ' ')
                        value = value.replace('Z','')
                    }
                    arrValue.push("'"+value+"'")
                    break
                case "datetime":
                    var value = val[field]
                    if(moment.isDate(value)){
                        value = moment(value).format('YYYY-MM-DD HH:mm:ss')
                    }else{
                        value = value.replace('T', ' ')
                        value = value.replace('Z','')
                    }
                    arrValue.push("'"+value+"'")
                    break
                default:
                    if(tableInfo.fields[field].length<val[field].length*2){
                        await this.excSql(env, 'alter table '+table+' alter column '+field+' varchar('+(val[field].length*2)+')')
                    }
                    if(typeof val[field] === 'string'){
                        arrValue.push("'"+val[field].replace(/'/g,`''`)+"'")
                    }else{
                        arrValue.push("'"+val[field]+"'")
                    }
                    break
            }
        }
        strSql = "insert into "+table+"("+arrField.join(',')+")values("+arrValue.join(',')+")"
        var rst = await this.excSql(env, strSql)
        strSql = "select last_insert_rowid() newid"
        strSql = "select case when IDENT_CURRENT('"+table+"') is null then max(FID) else cast(IDENT_CURRENT('"+table+"') as varchar(255)) end newid from "+table+""
        rst = await this.getData(env, strSql)
        rst = rst.recordset
        return rst[0]['newid']
    }

    async write(env, table, filter, val) {
        var tableInfo = await this.tableInfo(env, table)
        var strWhere = this.filterStr(tableInfo, filter)
        var arrSet = [],set = undefined
        for(var field in val){
            if(!tableInfo.fields[field]){
                continue
            }
            set = field +"="
            switch(tableInfo.fields[field].type){
                case "int":
                case "double":
                case "bit":
                    set+=val[field]
                    break
                case "bool":
                    set+=val[field]
                    break
                case "date":
                    var value = val[field]
                    if(moment.isDate(value)){
                        value = moment(value).format('YYYY-MM-DD')
                    }else{
                        value = value.replace('T', ' ')
                        value = value.replace('Z','')
                    }
                    str+="'"+value+"'"
                    break
                case "datetime":
                    var value = val[field]
                    if(moment.isDate(value)){
                        value = moment(value).format('YYYY-MM-DD HH:mm:ss')
                    }else{
                        value = value.replace('T', ' ')
                        value = value.replace('Z','')
                    }
                    str+="'"+value+"'"
                    break
                default:
                    if(tableInfo.fields[field].length<val[field].length*2){
                        await this.excSql(env, 'alter table '+table+' alter column '+field+' varchar('+(val[field].length*2)+')')
                    }
                    if(typeof val[field] === 'string'){
                        set+="'"+val[field].replace(/'/g,`''`)+"'"
                    }else{
                        set+="'"+val[field]+"'"
                    }
            }
            arrSet.push(set)
        }
        var strSql="update " + table +" set "+arrSet.join(',')
        if(strWhere) {
            strSql += " where " + strWhere
        }
        if (arrSet.length>0){
            return await this.excSql(env, strSql)
        }
    }

    async delete(env, table, filter) {
        var tableInfo = await this.tableInfo(env, table)
        var strWhere = this.filterStr(tableInfo, filter)
        var strSql = "delete from "+table+""
        if(strWhere) {
            strSql += " where " + strWhere
        }
        return await this.excSql(env, strSql)
    }
}
module.exports = Mssql
