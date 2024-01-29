const express = require('express');
const router = express.Router();
const userModel = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const {google} = require("googleapis");
const bcrypt = require('bcrypt');
const authenticate = require("../authentication");



//  API FOR USER REGISTRATION


router.post("/register", async (req,res,next) =>{
   
   console.log("API signup hit!");

    try {
        
        //checking the db to see if user exists
      const existUser  = await userModel.findOne({ email: req.body.user.email });
        if(existUser) return res.status(500).send( "You are already a registered User")

        //checking if password and confirmPassword matches
      else if(req.body.user.password!==req.body.user.confirmPassword)
                return res.status(500).send( "Password and confirm password doesn't match")

        //saving data into db
      else{

        const userData = new userModel({...req.body.user});

        //hashing password
         const randomString1 = await bcrypt.genSalt(10);
         userData.password = await bcrypt.hash(userData.password, randomString1);

         //hashing confirmPassword
         const randomString2 = await bcrypt.genSalt(10);
         userData.confirmPassword = await bcrypt.hash(userData.confirmPassword, randomString2);

          
        const newUser = await userData.save();
        console.log(newUser);
        res.status(200).send(newUser)
    }

    } catch(err) {
        console.error(err);
        res.status(500).send(err);
    }
})


//API FOR LOG IN


router.post("/login", async(req,res,next)=>{
    console.log(req.body);

    //validate email

    const existUser = await userModel.findOne({email : req.body.email})
    if(!existUser) return res.status(500).send("You are not a registered user")

     // Password Validation
    const isValid = await bcrypt.compare(req.body.password, existUser.password )
    if(!isValid) return res.status(500).send("Incorrect password")


    //generating token

    const token = jwt.sign({id: existUser._id, email:existUser.email}, "guvib46", {expiresIn : '1d'});
   

    //generating cookie

    res.cookie("usercookie", token,{
        expires:new Date(Date.now() + 86400000),
        httpOnly: true
    });

    const response = {
        existUser,
        token
    }

    res.status(200).send(response);
})


// API FOR user validation

router.get("/validateUser", authenticate,  async(req,res,next) =>{

    console.log("api validate user hit");

    try{

        const validUser = await userModel.findOne({_id:req.body.currentUser.id})
        res.status(200).send(validUser);
    }
    catch(err)
    {
       console.log(err)
       res.status(400).send("Invalid user");
    }
})

// API FOR LOG OUT

router.get("/logout", authenticate,  async(req,res,next) =>{
    try
    {
       res.clearCookie("usercookie", {path:"/"})
       res.status(200).send("authenticated and cookie removed")
    }
    catch 
     {
      res.status(400).send("error removing cookie")
     }
})



/*  API FOR SENDING THE RESET LINK TO THE USER

 http://localhost:3000/user/forgot-password

{
    "user" : {
        "email":"sne1320ha@gmail.com"
    }
}
*/


router.post("/forgot-password",async (req,res,next) => {
    
    console.log("API forgot-password hit!");

    const userEmail = req.body.email; 

    console.log("email entered",userEmail);

   //step 1: checking if email exists in the db

   const resultdoc =  await userModel.findOne({email: userEmail});

   if(!resultdoc)
   	return res.status(400).send("user not registered");

   //step 2: user exists, hence create one time link with the random string(token) that is valid for 15min

   const secret = "guvib46" + resultdoc.password; //password is concatenated to make it one time link. so that once the user changes the password he can't use the same link to change the password again

   const payload = {
   	email: resultdoc.email,
   	id: resultdoc._id
   }

   const token = jwt.sign(payload, secret, {expiresIn :'5m'});
  
   const link = `$https://localhost:3001/user/reset-password/${resultdoc._id}/${token}`;


   //step 3: sending the link via mail

   const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth:{
        user:"ramsanthoshbms@gmail.com",
        pass:"lhgg bcve dyqf wtnq"
    }
}) 

   const mailOptions = {
     
        from: 'ramsanthoshbms@gmail.com',
        to: resultdoc.email,
        subject: "reset-password link",
        text: `This link is valid for 15min : ${link}`,

   }

   transporter.sendMail(mailOptions,(error,info)=>{
                if(error){
                    console.log("error",error);
                    return res.status(400).send("email not sent")
                }else{
                    console.log("Email sent",info.response);
                    return res.status(200).send("Email sent Successfully")
                }
            })


})


//API FOR VERIFYING USER BEFORE DISPLAYING THE PAGE TO ENTER NEW PASSWORD


router.get("/reset-password/:id/:token", async (req,res,next) =>{

    console.log("API reset password hit!");

    const {id, token} = req.params;

    const userData = await userModel.findOne({_id: id});

    if(!userData)
         res.status(400).send("No such user exists")

    const secret = "guvib46" +  userData.password;

    console.log(userData);


try{
    
    const payload = jwt.verify(token,secret);

    if(!payload)
         res.status(400).send("Link expired");
    else
         res.status(200).send(payload);
    
}
catch(err){
    console.log(err);
     res.status(400).send("Link not valid");
}

})


// API TO CHANGE PASSWORD

router.post("/:id/:token", async (req,res,next) =>{

    console.log("API to change password hit!");

    const {id, token} = req.params;

    const {password, cpassword} = req.body;

    //checking if user exists

    const userData = await userModel.findOne({_id: id});

    if(!userData)
         res.status(400).send("No such user exists")

     //verifying token

    const secret = "guvib46" +  userData.password;

    try{
    
    const payload = jwt.verify(token,secret);

    if(!payload)
         res.status(400).send("Link expired");
    else
    {
        //hashing password
         const randomString1 = await bcrypt.genSalt(10);
         const newPassword = await bcrypt.hash(password, randomString1);

         //hashing confirmPassword
          const randomString2 = await bcrypt.genSalt(10);
          const newCpassword = await bcrypt.hash(cpassword, randomString2);

         const newUserData = await userModel.findByIdAndUpdate({_id:id},{password:newPassword, confirmPassword:newCpassword});
         newUserData.save();
         res.status(200).send("new password saved");
    }
        
    
    }
     catch(err){
         console.log(err);
         res.status(400).send("Link not valid");
    }

})


module.exports = router;