const redis = require('redis');

const redisClient = new redis.createClient({
    url:'redis://default:mypassword@redis-stack:6379'
}
   
)

redisClient.on('error', err => console.log("Redis client error", err))

exports.sendMessageToDataHandling = async function(data) {
    await redisClient.connect();

    await redisClient.publish('measurement_message', JSON.stringify(data));
    console.log('Published message to Redis channel measurement_message ');
    await redisClient.quit();
}
    
exports.getLatestData =  async function ()  {
    if(redisClient.status !== 'ready')
    await redisClient.connect()
    if(redisClient.isReady){
    let latestSenzorData = await redisClient.hGetAll('sensorValues');
   await redisClient.quit()
    return latestSenzorData;
    }
}