const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const categorySchema = new Schema({
    type:{
        type:String,
        required:true,
        enum:["difficulty","interviewType","technology","company"],
    },
    name:{
        type:String,
        required:true,
        trim:true,
    }
},{ timestamps: true });

module.exports = mongoose.model("Category",categorySchema);