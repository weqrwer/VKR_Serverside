//check userID and desired page userID
var privateinfo=function(){
    return (req, res,next) => {
      var temp=req.params.id==req.user.idUser;
      console.log(req.user.idUser)
      if(temp)
      {
        next();
      }
      else(
        console.log("trying to get someone else data")
      )
    }
  }
  module.exports=privateinfo;