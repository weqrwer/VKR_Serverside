//MIDDLEWARE FOR CHECKING IF USER IS LOGGED IN 
 var  authenticationMiddleware=function (){
    return function (req, res, next) {
        if (req.isAuthenticated()){
            return next()
        }
       else {
         res.status(403).json({message: "Forbidden"});
        }
    }
  }
  module.exports=authenticationMiddleware;