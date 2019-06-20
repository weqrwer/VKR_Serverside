var express = require('express');
var app = express();
var passport= require('passport');
var LocalStrategy= require('passport-local').Strategy;
var mysql      = require('mysql');
const bcrypt = require('bcrypt');
var dbb = require('./db');//connect тут
//Предполагается, что пароли, сохраненные в БД, зашифрованы с помощью bcrypt (rounds=10)
module.exports=function(passport,dbb)
{
    passport.use('local', new LocalStrategy(
   {
   usernameField: 'login',
   passwordField: 'password',
   passReqToCallback: true 
 } , function (req, login, password, done){
       if(!login || !password ) { return done(null, false, req.flash('message','All fields are required.')); }
      
       dbb.query("select * from user where login = ?", [login], function(err, rows)
       {
 
           console.log(err); 
         if (err) return done(req.flash('message',err));
 
         if(!rows.length)
         { return done(null, false, req.flash('message','Invalid username or password.'));}
 
         var encPassword =password;
         var dbPassword  = rows[0].password;
         /*if(!(dbPassword == encPassword)){
 
             return done(null, false, req.flash('message','Invalid username or password.'));
 
          }*/
          bcrypt.compare( encPassword,  dbPassword, function(err, res) {
            if(res===true){
            console.log("OK")}
            else 
            {return done(null, false, req.flash('message','Invalid username or password.'));}
        });
 
         return done(null, rows[0]);
 
       });
 
     }
 
 ));

 passport.serializeUser(function(user, done) {
   done(null, user.idUser);
   console.log("RABOTAET serialize")
 });
 

 passport.deserializeUser(function(id, done) {
   dbb.query("select * from user where idUser=" + id, function (err, rows)
   {
     console.log("RABOTAET deserialize")
     done(err, rows[0]);
 });
 });

}
