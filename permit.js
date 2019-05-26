//MIDDLEWARE FOR CHECKING ACCESS RIGHTS BASED ON TYPE OF USER
 var permit=function (...allowed){
    return (req, res, next) => {
    
      console.log((allowed.indexOf(req.user.type) > (-1)))
      if (req.user &&(allowed.indexOf(req.user.type) > (-1)) ){
        console.log("success")
        next(); // role is allowed so continue 
      }
      else {
        console.log("NO")
        res.status(403).json({message: "Forbidden"}); // user is forbidden
  
      }
  
    }
  }
  module.exports=permit;