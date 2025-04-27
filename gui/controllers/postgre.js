const pg = require('pg');
//connection details pg
const pgPool = new pg.Pool({
    user: "timescaledb",
    password: "password",
    host: "timescaledb",
    port: "5432",
    database: "timescaledb",
});

//query to create new measurement in pg
exports.createMeasurement = async function (title, description) {
    const startTime = new Date().toISOString();
    let pgClient;
    const query = `
        INSERT INTO ferm.measurement_detail (title, start_time, description)
        VALUES ($1, $2, $3)
        RETURNING id;
    `;
    try {
        pgClient = await pgPool.connect(); // Connect to the database
        const result = await pgClient.query(query, [title, startTime, description]);
        console.log(`Inserted new measurement detail with ID: ${result.rows[0].id}`);

        return result.rows[0].id

    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        if (pgClient) {
            pgClient.release();
        }
    }
}



// query to get details of current / latest measurement from pg
exports.getLatestMeasurementDetail = async function () {

    let pgClient;
    try {
        pgClient = await pgPool.connect();
        const result = await pgClient.query(`SELECT id, title, description, status FROM ferm.measurement_detail
                              WHERE id = (
                                SELECT MAX(id) FROM ferm.measurement_detail
                                );`
        )
        return { id: result.rows[0].id, title: result.rows[0].title, description: result.rows[0].description, status: result.rows[0].status }




    } catch (err) {
        console.error('Error executing query', err);

    } finally {
        pgClient.release()
    }
}

// Query to pg when client sets the current measurement as finished
exports.finishMeasurement = async function (id) {
    const endTime = new Date().toISOString();
    let pgClient;
    const query = `
       UPDATE ferm.measurement_detail 
        SET end_time = $2, status = $3
        WHERE id = $1
        RETURNING id;
    `;
    try {
        pgClient = await pgPool.connect();
        const result = await pgClient.query(query, [id, endTime, 1]);


        return result.rows[0].id

    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        if (pgClient) {
            pgClient.release();
        }
    }
}


exports.saveDescription = async function (desc) {
    const endTime = new Date().toISOString();
    let pgClient
    const query = `
       UPDATE ferm.measurement_detail 
        SET description = $2
        WHERE id = $1
        RETURNING id;
    `;
    try {

        pgClient = await pgPool.connect();
        const state = await getLatestMeasurementDetail()

        const result = await pgClient.query(query, [id, desc]);


        return result.rows[0].id

    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        if (pgClient) {
            pgClient.release();
        }
    }
}


//query to get full history of measurements
exports.getHistory = async function () {
    let pgClient;

    try {
        pgClient = await pgPool.connect();
        const result = await pgClient.query(`SELECT id, title,start_time,end_time, description FROM ferm.measurement_detail
                                             WHERE status = 1`)
        console.log(result.rows)
        return result.rows




    } catch (err) {
        console.error('Error executing query', err);

    } finally {
        pgClient.release()
    }
}


exports.deleteMeasurement = async function (id) {
    let pgClient;
    try {
        pgClient = await pgPool.connect();

        const queryMetaData = `SELECT  start_time,end_time FROM ferm.measurement_detail WHERE id = $1 `;
        const queryDeleteData = `DELETE FROM ferm.measurement WHERE id=$1`
        const queryDeleteMetaData = `DELETE FROM ferm.measurement_detail WHERE id=$1`
        const queryRefreshMaterializedView = `CALL refresh_continuous_aggregate('ferm.1min_measurement', $1::timestamp, $2::timestamp)`
        await pgClient.query('BEGIN');
        const result = (await pgClient.query(queryMetaData, [id]))
        let metaData
        if (result.rowCount === 0) {
            throw new Error(`Metadata pro ID:${id} nenalezena`)
        } else {
            metaData = result.rows[0]
        }
        await pgClient.query(queryDeleteData, [id])
        await pgClient.query(queryDeleteMetaData, [id])
        await pgClient.query('COMMIT');


        const start = new Date(metaData.start_time);
        const end = new Date(metaData.end_time);

        if ((end.getTime() - start.getTime()) < 60 * 1000) {
            
            console.log('Skipping refresh: window too small');
        } else {
            await pgClient.query(queryRefreshMaterializedView, [metaData.start_time, metaData.end_time]);
        }



        return true

    } catch (err) {
        await pgClient.query('ROLLBACK');
        console.error('Error executing query', err);
        return false

    } finally {
        if (pgClient) {
            pgClient.release();
        }
    }
}