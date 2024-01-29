const mongo = require("mongoose");
 
module.exports.connectdb = async() => {
try{
    await mongo.connect("mongodb+srv://guvib46:guviB46@cluster0.ebhseuj.mongodb.net/?retryWrites=true&w=majority");
    console.log("connected")
}
catch(err){
    console.log(err);
   
}
}
