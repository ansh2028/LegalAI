const mongoose=require("mongoose");






const connectToDB=async()=>{
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Database connected successfully");

    }
    catch(err){
        console.log("problem in connecting database" , err);
        
    }
 
}

module.exports = connectToDB;