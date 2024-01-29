const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const validator= require("validator");


const userSchema = new Schema ({

	name:{
		type: String,
		required : true,
		trim: true
	},

	email :{
		type: String,
		required:true,
		trim: true,
    unique:true,
    validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error("not valid email")
            }
        }
	},

	password: {
		type: String,
		required: true,
		minlength:6,
	},

	confirmPassword: {
		type: String,
		required: true,
		minlength:6,
	},


})

const userModel = mongoose.model("users", userSchema )

module.exports = userModel;