const Pool = require('pg').Pool;

const util = require('util');

const pool = new Pool({
    user: process.env.db_user,
    host: process.env.db_host,
    database: process.env.db_db,
    password: process.env.db_pass,
    port: process.env.db_port,
})



class Service{
    constructor() {

    }


    query = async function(query, params) {
        try {
            const data = await pool.query(query, params);
           // console.log(data);
            return {
                success: true,
                data: data.rows
            }
        } catch (error) {
            console.log(error);
            return {
                success: false,
                error
            }
        }
    }
    finish = async function (){
        pool.end().then(() => console.log('pool has ended'));
    }
}
exports.Service = Service;