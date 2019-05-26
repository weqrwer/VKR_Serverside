var express = require('express');
var app = express();
var flash= require('connect-flash');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport= require('passport');
var LocalStrategy= require('passport-local').Strategy;
var cors = require('cors');
var authenticationMiddleware = require('./authenticationMiddleware');
var permit = require('./permit');
var privateinfo = require('./privateinfo');
// to support JSON-encoded bodies
// to support URL-encoded bodies - 
app.use(bodyParser.urlencoded({
  extended : false
}));
app.use(bodyParser.json());

//middleware for messages
app.use(flash());

//session middleware
app.use(session(
  { secret: 'keyboard cat', 
  cookie: { maxAge: 2592000000 },
  resave: true,
  saveUninitialized:true
}));

//database
var db = require('./config/db');

//passport
require("./config/passport")(passport,db);
//passport middleware
app.use(passport.initialize());
app.use(passport.session());

//PORT 8000
app.listen(8000, function () {
  console.log('Example app listening on port 3000!');
});

//CORS middleware
app.use(function(req, res, next) {
  var allowedOrigins = ['http://localhost:3000']
  res.header('Access-Control-Allow-Origin', allowedOrigins);
  res.header( 'Access-Control-Allow-Headers', 'withCredentials, Access-Control-Allow-Headers, Origin, X-Requested-With, X-AUTHENTICATION, X-IP, Content-Type, Accept, Access-Control-Request-Method, Access-Control-Request-Headers');
  res.header( 'Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD, POST, PUT, DELETE');
  res.header( 'Access-Control-Allow-Credentials', true);
  next();

});




//Вход в систему
app.post("/api/signin", passport.authenticate('local', 
{
  failureRedirect: '/signin',
  failureFlash: true}),
   function(req, res) {
   console.log("authorization")
   console.log(req.user)
   res.send(req.user)//вход выполнен
});

//ПРОФИЛЬ СТУДЕНТА
app.get("/api/studentprofile/:id",privateinfo(),
permit("student"),
  function(req,res){
  temp=req.user.idUser
  db.query('SELECT User.idUser, user.name, user.middle_name, user.last_name, user.department, user.type, student.user_idUser, student.idStudent, student.faculty, student.year_of_study FROM user INNER JOIN student on idUser=User_idUser WHERE student.User_idUser= ? ',temp, function(err, rows, fields) {
    if (err) throw err
    res.send(rows)
  });
 
})

//КАТАЛОГ ПРОЕКТОВ (ДЛЯ ВСЕХ)
app.get("/api/projectcatalog",
permit("student","admin","supervisor","professor"),
  function(req,res){
      db.query('SELECT idProjects,project_name,type_of_project,amount_of_students,status_of_project, DATE_FORMAT(beginning_date,\'%Y-%m-%d\') as begdate,DATE_FORMAT(ending_date,\'%Y-%m-%d\') as enddate,comment,location,intensity,main_tasks,goals,Professor_idProfessor FROM projects WHERE (status_of_project="согласован" OR status_of_project="в процессе" OR status_of_project="в работе" OR status_of_project="завершен")', function(err, rows, fields) {
      if (err) throw err
      res.send(rows)
    });
    
  } 
)
//МОИ ПРОЕКТЫ - У СТУДЕНТА
app.get("/api/studentprofile/:id/myprojects",permit("student"),privateinfo(),
function(req,res){
  console.log(req.user)
  var temp=req.user.idUser//type- student
  //db.query('SELECT * FROM student INNER JOIN roles_of_project ON idStudent = roles_of_project.Student_idStudent INNER JOIN projects ON roles_of_project.Projects_idProjects = projects.idProjects WHERE student.User_idUser = ?', temp, function(err, rows, fields) {
    db.query('SELECT idstudent, project_name, idProjects,DATE_FORMAT(beginning_date,\'%Y-%m-%d\') AS begdate,DATE_FORMAT(ending_date,\'%Y-%m-%d\') AS enddate,idRoles_of_project,status_of_project,status_of_role,role FROM student INNER JOIN roles_of_project ON idStudent = roles_of_project.Student_idStudent INNER JOIN projects ON roles_of_project.Projects_idProjects = projects.idProjects WHERE student.User_idUser = ?', temp, function(err, rows, fields) {
    if (err) throw err
    res.send(rows)
  });
}
)


//ocenki actual_grades
app.get("/api/studentprofile/:id/mygrades",permit("student"),privateinfo(),function(req,res){
   var temp=req.params.id
  db.query('SELECT idStudent, project_name, idProjects,DATE_FORMAT(beginning_date,\'%Y-%m-%d\') AS begdate,DATE_FORMAT(ending_date,\'%Y-%m-%d\') AS enddate,idRoles_of_project,status_of_project,status_of_role,role,credits,actual_credits,SUM(actual_credits),SUM(credits) FROM student INNER JOIN roles_of_project ON idStudent = roles_of_project.Student_idStudent INNER JOIN grade_for_stage ON roles_of_project.idRoles_of_project=grade_for_stage.Roles_of_project_idRoles_of_project INNER JOIN projects ON roles_of_project.Projects_idProjects = projects.idProjects WHERE student.User_idUser = ? group by idProjects'
  ,temp, function(err, rows, fields) {
    if (err) throw err
    res.send(rows)
  })
})





//МОИ ЗАЯВКИ - У СТУДЕНТА
app.get("/api/studentprofile/:id/myapplications",permit("student"),privateinfo(),
function(req,res){
  db.query('SELECT idStudent from student WHERE student.User_idUser= ?',req.params.id,
  function(err, rows, fields) {
    var temporary=JSON.parse(JSON.stringify(rows[0]))['idStudent']
  //db.query('SELECT * FROM student  INNER JOIN student_application ON idStudent = student_idStudent WHERE student.User_idUser = ?',temp,
  db.query('select * from Projects inner join roles_of_project on idProjects=roles_of_project.Projects_idProjects inner join student_application on roles_of_project.idRoles_of_project=student_application.roles_of_project_idRoles_of_project where student_application.Student_idStudent = ?',
  temporary,function(err, rows, fields) {
    if (err) throw err
    res.send(rows)
  });
});
}
)

//заявка студента
app.get("/api/studentprofile/:id/myapplications/:index",permit("student"),privateinfo(),
function(req,res){
  db.query('SELECT idStudent from student WHERE student.User_idUser= ?',req.params.id,
  function(err, rows, fields) {
    var temporary=JSON.parse(JSON.stringify(rows[0]))['idStudent']
  //db.query('SELECT * FROM student  INNER JOIN student_application ON idStudent = student_idStudent WHERE student.User_idUser = ?',temp,
  db.query('select projects.idProjects,projects.project_name,roles_of_project.idRoles_of_project,roles_of_project.role,student_application.idStudent_application,student_application.student_contact_inf,DATE_FORMAT(date,\'%Y-%m-%d\') as date,student_application.status_of_app,student_application.priority,student_application.comment,student_application.student_idStudent from Projects inner join roles_of_project on idProjects=roles_of_project.Projects_idProjects inner join student_application on roles_of_project.idRoles_of_project=student_application.roles_of_project_idRoles_of_project where (student_application.Student_idStudent = ? and student_application.idStudent_application=?)',
  [temporary,req.params.index],function(err, rows, fields) {
    if (err) throw err
    res.send(rows)
  });
});
}
)

//доступ к каждому проекту из КАТАЛОГА ПРОЕКТОВ (для всех) 
app.get("/api/projectcatalog/:idproject",
permit("student","admin","supervisor","professor"),
function(req,res){
var temp=req.params.idproject
    db.query('SELECT idProjects,project_name,type_of_project,amount_of_students,status_of_project, DATE_FORMAT(beginning_date,\'%Y-%m-%d\') as begdate,DATE_FORMAT(ending_date,\'%Y-%m-%d\') as enddate,comment,location,intensity,main_tasks,goals FROM projects WHERE projects.idProjects = ?'
    ,temp, function(err, rows, fields){
      if (err) throw err
      console.log(rows)
      res.send(rows)
    });
})


//роли проектов
app.get("/api/projectcatalog/:idproject/roles",
permit("student","admin","supervisor","professor"),
function(req,res){ 
var temp=req.params.idproject
    db.query('SELECT * FROM roles_of_project WHERE roles_of_project.Projects_idProjects = ?'
    ,temp, function(err, rows, fields){
      if (err) throw err
      console.log(rows)
      res.send(rows)
    });
})

//этапы проектов
app.get("/api/projectcatalog/:idproject/stages",
permit("student","admin","supervisor","professor"),
function(req,res){ 
var temp=req.params.idproject
    db.query('SELECT idStages_of_project,number_of_stage,DATE_FORMAT(date_beggining,\'%Y-%m-%d\') as begdate,DATE_FORMAT(date_ending,\'%Y-%m-%d\') as enddate FROM stages_of_project WHERE stages_of_project.Projects_idProjects = ? order by stages_of_project.number_of_stage'
    ,temp, function(err, rows, fields){
      if (err) throw err
      console.log(rows)
      res.send(rows)
    });
})

//преподаватель проекта
app.get("/api/projectcatalog/:idproject/prep",
permit("student","admin","supervisor","professor"),
function(req,res){ 
var temp=req.params.idproject
    db.query('select name,middle_name,last_name from user inner join professor on idUser=professor.User_idUser inner join projects on idProfessor=projects.Professor_idProfessor where idProjects= ?'
    ,temp, function(err, rows, fields){
      if (err) throw err
      console.log(rows)
      res.send(rows)
    });
})



//заявка студента на участие в проекте из каталога проектов
app.post("/api/studentprofile/:id/application",authenticationMiddleware(),privateinfo(),
permit("student"),
function(req,res){
  var tempp=randomIntFromInterval(10,1000)
  var temp= req.body
  temp['idStudent_application']=tempp
  var today = new Date()
  var dd = String(today.getDate()).padStart(2, '0')
  var mm = String(today.getMonth() + 1).padStart(2, '0') //January is 0!
  var yyyy = today.getFullYear()
  today = yyyy+'-'+mm+'-'+dd
  temp['date']=today
  temp['status_of_app']='на согласовании'
  db.query('SELECT idStudent from student WHERE student.User_idUser= ?',req.params.id,
  function(err, rows, fields) {
    if (err) throw err;
    //console.log(JSON.parse(JSON.stringify(rows[0]))['idStudent'])
    temp['Student_idStudent']=JSON.parse(JSON.stringify(rows[0]))['idStudent'];
    db.query('INSERT INTO student_application  SET ?',
  temp, 
  function(err, rows, fields) {
    if (err) throw err
    res.send("OK")
  });
  })
})

app.get("/api/professorprofile/:id/studentappl",privateinfo(),
permit("professor","admin","supervisor"),
function(req,res){
db.query('select idUser, user.name,user.middle_name,user.last_name,student.idStudent,idStudent_application,status_of_app,roles_of_project.idRoles_of_project,roles_of_project.role,project_name,status_of_project from user inner join student on idUser=student.User_idUser inner join student_application on student.User_idUser=student_application.Student_idStudent inner join roles_of_project on student_application.Roles_of_project_idRoles_of_project=roles_of_project.idRoles_of_project inner join projects on roles_of_project.Projects_idProjects=projects.idProjects',
function(err, rows, fields) {
  if (err) throw err
  res.send(rows)
})
})

//История проектов (только для преподавателя)
app.get("/api/professorprofile/:id/history",privateinfo(),
permit("professor"),
function(req,res){
  db.query('SELECT idProfessor from professor WHERE professor.User_idUser= ?',
  req.params.id,function(err, rows, fields) {
    if (err) throw err
    var tempor=JSON.parse(JSON.stringify(rows[0]))['idProfessor']
db.query(' select user.name,user.middle_name,user.type,user.last_name,projects.project_name,projects.Professor_idProfessor, history_of_project.idhistory_of_project, DATE_FORMAT(date_of_status_changing,\'%Y-%m-%d\') as date_of_status_changing, history_of_project.status, history_of_project.Projects_idProjects, history_of_project.User_idUser from user inner join history_of_project on idUser=history_of_project.User_idUser inner join projects on history_of_project.Projects_idProjects=projects.idProjects where projects.Professor_idProfessor=?',
tempor,function(err, rowss, fields) {
  if (err) throw err
  res.send(rowss)
})
  })

})


//У ПРОФЕССОРА - МОИ ПРОЕКТЫ 
app.get("/api/professorprofile/:id/professorprojects",privateinfo(),
permit("professor"),
function(req,res){
db.query('select idUser, idProfessor,idProjects,project_name,status_of_project,DATE_FORMAT(beginning_date,\'%Y-%m-%d\') as begdate,DATE_FORMAT(ending_date,\'%Y-%m-%d\') as enddate from user inner join professor on idUser=professor.User_idUser inner join projects on idProfessor=projects.Professor_idProfessor where idUser=?;',
req.params.id,function(err, rows, fields) {
  if (err) throw err
  res.send(rows)
})
})



//У ПРОФЕССОРА - МОИ ЗАЯВКИ СТУДЕНТОВ
app.get("/api/professorprofile/:id/professorsapp",privateinfo(),
permit("professor"),
function(req,res){
db.query('SELECT idProfessor from professor WHERE professor.User_idUser= ?',
req.params.id,function(err, rows, fields) {
  if (err) throw err
  var tempor=JSON.parse(JSON.stringify(rows[0]))['idProfessor']
  db.query('select idProjects,status_of_project, project_name,idRoles_of_project,role,status_of_role,idStudent_application,student_application.Student_idStudent,status_of_app,user.name,user.middle_name,user.last_name from projects inner join roles_of_project on idProjects=roles_of_project.Projects_idProjects inner join student_application on roles_of_project.idRoles_of_project=student_application.Roles_of_project_idRoles_of_project inner join student on student_application.Student_idStudent=student.idStudent inner join user on student.User_idUser=user.idUser where(projects.Professor_idProfessor=? and( projects.status_of_project=\'в процессе\' or projects.status_of_project=\'согласован\' or projects.status_of_project=\'в работе\'))',
  tempor, function(err, rowss, fields) {
    if (err) throw err
    console.log("AAAAAAAAAAA")
    res.send(rowss)
  })
  
})
})

//ПРОСМОТР ЗАЯВКИ СТУДЕНТА АДМИНОМ ИЛИ АКРУКОМ
app.get("/api/professorprofile/:id/checkstudentappl/:index",privateinfo(),
permit("supervisor","admin"),
function(req,res){
  db.query('select idProjects,project_name,status_of_project, idRoles_of_project,role,idStudent_application,student_contact_inf,DATE_FORMAT(date,\'%Y-%m-%d\') as date,priority,student_application.comment,student_application.Student_idStudent,status_of_app,user.name,user.middle_name,user.last_name from projects inner join roles_of_project on idProjects=roles_of_project.Projects_idProjects inner join student_application on roles_of_project.idRoles_of_project=student_application.Roles_of_project_idRoles_of_project inner join student on student_application.Student_idStudent=student.idStudent inner join user on student.User_idUser=user.idUser where(idStudent_application= ?)',
  req.params.index, function(err, rowss, fields) {
    if (err) throw err
    res.send(rowss)
  })
  
})



//ПРОСМОТР ЗАЯВКИ СТУДЕНТА ПРОФЕССОРОМ
app.get("/api/professorprofile/:id/professorappoval/:idd",privateinfo(),
permit("professor"),
function(req,res){
db.query('SELECT idProfessor from professor WHERE professor.User_idUser= ?',
req.params.id,function(err, rows, fields) {
  if (err) throw err
  var tempor=JSON.parse(JSON.stringify(rows[0]))['idProfessor']
  db.query('select idProjects,project_name,status_of_project, idRoles_of_project,role,necessary_skills, role_recommendations,status_of_role,idStudent_application,student_contact_inf,DATE_FORMAT(date,\'%Y-%m-%d\') as date,priority,student_application.comment,student_application.Student_idStudent,status_of_app,user.name,user.middle_name,user.last_name from projects inner join roles_of_project on idProjects=roles_of_project.Projects_idProjects inner join student_application on roles_of_project.idRoles_of_project=student_application.Roles_of_project_idRoles_of_project inner join student on student_application.Student_idStudent=student.idStudent inner join user on student.User_idUser=user.idUser where( projects.Professor_idProfessor=?  and idStudent_application= ? and( projects.status_of_project=\'в процессе\' or projects.status_of_project=\'согласован\' or projects.status_of_project=\'в работе\' ))',
  [tempor,req.params.idd], function(err, rowss, fields) {
    if (err) throw err
    res.send(rowss)
  })
  
})
})





//РОЛЬ ПРОЕКТА С ОЦЕНКАМИ ИЗ КАТАЛОГА ПРОЕКТОВ
app.get("/api/profile/:id/proj/:idd/roleofpr/:iddd",
function(req,res){
db.query('select idProjects, idRoles_of_project,roles_of_project.role,roles_of_project.necessary_skills,roles_of_project.role_recommendations,roles_of_project.year_of_study,roles_of_project.status_of_role,roles_of_project.Projects_idProjects,grade_for_stage.idgrade_for_stage,grade_for_stage.Roles_of_project_idRoles_of_project,grade_for_stage.Stages_of_project_idStages_of_project,grade_for_stage.credits,grade_for_stage.actual_credits,stages_of_project.number_of_stage, DATE_FORMAT(date_beggining,\'%Y-%m-%d\') as date_beggining,DATE_FORMAT(date_ending,\'%Y-%m-%d\')  as date_ending from projects inner join roles_of_project on idProjects=roles_of_project.Projects_idProjects inner join grade_for_stage on idRoles_of_project=grade_for_stage.Roles_of_project_idRoles_of_project inner join stages_of_project on grade_for_stage.Stages_of_project_idStages_of_project=stages_of_project.idStages_of_project where (idProjects=? and idRoles_of_project=?) order by stages_of_project.number_of_stage',
[req.params.idd,req.params.iddd],function(err, rowss, fields) {
  if (err) throw err
    res.send(rowss)
  
})
})


//согласование преподавателем заявки студента на проект
app.post("/api/professorprofile/:id/professorapproval/:indexapp/:iddstudent/:idrol",
function(req,res){
  var temp=req.params.indexapp;
 db.query('UPDATE student_application SET status_of_app=\'согласовано\' WHERE idStudent_application=?',
 temp,function(err, rows, fields){
  if (err) throw err
  db.query('UPDATE roles_of_project SET roles_of_project.status_of_role=\'занято\', roles_of_project.Student_idStudent=? WHERE idRoles_of_project=?',
  [req.params.iddstudent,req.params.idrol], function(err, rowss, fields) {
    if (err) throw err
    //res.send(rowss);
    res.send("UPDATE OK")
  })
 })
})
//согласование преподавателем заявки студента на проект(отказ)
app.post("/api/professorprofile/:id/professordisapproval/:indexapp/:iddstudent/:idrol",
function(req,res){
  var temp=req.params.indexapp
 db.query('UPDATE student_application SET status_of_app=\'отказано\' WHERE idStudent_application=?',
 temp,function(err, rows, fields){
  if (err) throw err
  res.send("UPDATE OK")
 })
})

//выставление оценок за проекты преподавателем
app.post("/api/professorprofile/:id/:iddproj/:idrol",function(req,res){
  console.log(req.body)
  req.body.map((i,j)=>{
    var t=i['Stages_of_project_idStages_of_project']
    var tt=+i['actual_credits']
    db.query('UPDATE grade_for_stage SET actual_credits=? WHERE grade_for_stage.Stages_of_project_idStages_of_project=?',[tt,t]
  ,function(err, rows, fields){
    if (err) throw err
   })
   
  })
  res.send("UPDATE OK")
})

//ПРОФЕССОР(КАК ТИП В БД) ПРОФАЙЛ
app.get("/api/professorprofile/:id", privateinfo(),
permit("professor","admin","supervisor"),
  function(req,res){
  console.log(req.params.id)
  temp=req.user.idUser
  db.query('SELECT user.idUser, user.name, user.middle_name, user.last_name, user.department, user.type, professor.idProfessor, professor.User_idUser,professor.job FROM user INNER JOIN professor on idUser=professor.User_idUser WHERE professor.User_idUser= ? ',temp, function(err, rows, fields) {
    if (err) throw err
    res.send(rows)
  });
 
})



//Одобрение академическим руководителем
app.get("/api/professorprofile/:id/supervisorapproval", privateinfo(),
permit("supervisor"),
  function(req,res){
    db.query(' SELECT user.name, user.middle_name,user.type,idProfessor,idProjects,project_name,status_of_project,DATE_FORMAT(beginning_date,\'%Y-%m-%d\') as begdate,DATE_FORMAT(ending_date,\'%Y-%m-%d\') as enddate FROM user INNER JOIN professor ON user.idUser=professor.User_idUser INNER JOIN projects ON professor.idProfessor=projects.Professor_idProfessor WHERE (status_of_project="на согласовании");', function(err, rows, fields) {
      if (err) throw err
      res.send(rows)
    }); 
  })

app.get("/api/professorprofile/:id/supervisorapproval/:index",permit("supervisor"),
function(req,res){
  var temp=req.params.index
  var histor={}
  var tempp=randomIntFromInterval(10,1000)
  var today = new Date()
  var dd = String(today.getDate()).padStart(2, '0')
  var mm = String(today.getMonth() + 1).padStart(2, '0') //January is 0!
  var yyyy = today.getFullYear()
  today = yyyy+'-'+mm+'-'+dd
  histor['date_of_status_changing']=today
  histor['idhistory_of_project']=tempp
  histor['status']='согласован акруком'
  histor['Projects_idProjects']=req.params.index
  histor['User_idUser']=req.params.id
 db.query('UPDATE Projects SET status_of_project=\'согласован акруком\' WHERE idProjects=?',
 temp,function(err, rows, fields){
  db.query('INSERT INTO history_of_project  SET ?',
  histor, function(err, rows, fields){

  if (err) throw err
  res.send("UPDATE OK")})
 })
})

app.get("/api/professorprofile/:id/supervisordisapproval/:index",permit("supervisor"),
function(req,res){
  var temp=req.params.index;
  var historr={}
  var tempp=randomIntFromInterval(10,1000)
  var today = new Date()
  var dd = String(today.getDate()).padStart(2, '0')
  var mm = String(today.getMonth() + 1).padStart(2, '0')//January is 0!
  var yyyy = today.getFullYear()
  today = yyyy+'-'+mm+'-'+dd
  historr['date_of_status_changing']=today
  historr['idhistory_of_project']=tempp
  historr['status']='отказано акруком'
  historr['Projects_idProjects']=req.params.index
  historr['User_idUser']=req.params.id
 db.query('UPDATE Projects SET status_of_project=\'отказано акруком\' WHERE idProjects=?',
 temp,function(err, rows, fields){
  db.query('INSERT INTO history_of_project  SET ?',
  historr, function(err, rows, fields){
  if (err) throw err
  res.send("UPDATE OK")})
 })
})


//Одобрение администратором (после академ рука)
app.get("/api/professorprofile/:id/adminapproval", 
  function(req,res){
    db.query(' SELECT user.name, user.middle_name,user.type,idProfessor,idProjects,project_name,status_of_project,DATE_FORMAT(beginning_date,\'%Y-%m-%d\') as begdate,DATE_FORMAT(ending_date,\'%Y-%m-%d\') as enddate FROM user INNER JOIN professor ON user.idUser=professor.User_idUser INNER JOIN projects ON professor.idProfessor=projects.Professor_idProfessor WHERE (status_of_project="согласован акруком")', function(err, rows, fields) {
      if (err) throw err
      res.send(rows)
    }); 

  })

app.get("/api/professorprofile/:id/adminapproval/:index",
function(req,res){
  var temp=req.params.index;
  var historyy={}
  var tempp=randomIntFromInterval(10,1000)
  var today = new Date()
  var dd = String(today.getDate()).padStart(2, '0')
  var mm = String(today.getMonth() + 1).padStart(2, '0') //January is 0!
  var yyyy = today.getFullYear()
  today = yyyy+'-'+mm+'-'+dd
  historyy['date_of_status_changing']=today
  historyy['idhistory_of_project']=tempp
  historyy['status']='согласован'
  historyy['Projects_idProjects']=req.params.index
  historyy['User_idUser']=req.params.id
 db.query('UPDATE Projects SET status_of_project=\'согласован\' WHERE idProjects=?',
 temp,function(err, rows, fields){
  db.query('INSERT INTO history_of_project  SET ?',
  historyy, function(err, rows, fields){

  if (err) throw err
  res.send("UPDATE OK")})
 })
})

app.get("/api/professorprofile/:id/admindisapproval/:index",
function(req,res){
  var temp=req.params.index
  var hist={}
  var tempp=randomIntFromInterval(10,1000)
  var today = new Date()
  var dd = String(today.getDate()).padStart(2, '0')
  var mm = String(today.getMonth() + 1).padStart(2, '0') //January is 0!
  var yyyy = today.getFullYear()
  today = yyyy+'-'+mm+'-'+dd
  hist['date_of_status_changing']=today
  hist['idhistory_of_project']=tempp
  hist['status']='отказано администратором'
  hist['Projects_idProjects']=req.params.index
  hist['User_idUser']=req.params.id
 db.query('UPDATE Projects SET status_of_project=\'отказано администратором\' WHERE idProjects=?',
 temp,function(err, rows, fields){
  db.query('INSERT INTO history_of_project  SET ?',
  hist, function(err, rows, fields){
  if (err) throw err
  res.send("UPDATE OK")})
 })
})


//функция для генерации айдишников
function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min)
}


//подача паспорта проекта преподавателем 
app.post("/api/professorprofile/:id/projectpassport",authenticationMiddleware(),
permit("professor"),
function(req,res){
  var tempp=randomIntFromInterval(10,1000)
  var temp={}
  temp['idProjects']=tempp
  temp['project_name']=req.body.project_name
  temp['type_of_project']=req.body.type_of_project
  temp['amount_of_students']=req.body.amount_of_students
  temp['status_of_project']='на согласовании'
  temp['beginning_date']=req.body.beginning_date
  temp['ending_date']=req.body.ending_date
  temp['comment']=req.body.comment
  temp['location']=req.body.location
  temp['intensity']=req.body.intensity
  temp['main_tasks']=req.body.main_tasks
  temp['goals']=req.body.goals
  var st=req.body.stagelist
  var stt=req.body.roleslist
  var  proff=0
  var a=[];
  var b=[];
  db.query('SELECT idProfessor from professor WHERE professor.User_idUser= ?',req.params.id,
  function(err, rows, fields) {
    if (err) throw err
    temp['Professor_idProfessor']=JSON.parse(JSON.stringify(rows[0]))['idProfessor'];
    db.query('INSERT INTO projects  SET ?',
  temp, 
  function(err, rows, fields) {
    if (err) throw err

for(n=0;n<stt.length;n++){
  var temporary={}
  var nl=randomIntFromInterval(10,1000)
  temporary['idRoles_of_project']=nl
  a.push(nl)
  temporary['role']=stt[n]['role']
  temporary['necessary_skills']=stt[n]['skills']
  temporary['role_recommendations']=stt[n]['reccoms']
  temporary['year_of_study']=+stt[n]['kurs']
  temporary['status_of_role']='свободно'
  temporary['Projects_idProjects']=tempp
  temporary['Student_idStudent']=null
  db.query('INSERT INTO roles_of_project  SET ?',
temporary, 
function(err, rows, fields) {
if (err) throw err
console.log( "roles insert ok")
})
}

for(j=0;j<st.length;j++){
  var kl=randomIntFromInterval(10,1000)
  b.push(kl)
  st[j]['idStages_of_project']=kl
  st[j]['Projects_idProjects']=tempp
  db.query('INSERT INTO stages_of_project  SET ?',
st[j], 
function(err, rows, fields) {
if (err) throw err
console.log( "stages insert ok")
})}

for (var i=0;i<stt.length;i++){
  console.log(stt[i].grades.map((item,ind)=>{return item}))
  for (var ii=0;ii<stt[i].grades.length;ii++){
    var ccd=0;
    for (var [key,val] of Object.entries(stt[i].grades[ii]))
     {
       var qw={}
       qw['idgrade_for_stage']=randomIntFromInterval(10,1000)
       console.log(qw['idgrade_for_stage'])
       qw['Roles_of_project_idRoles_of_project']=a[i]
       console.log(qw['Roles_of_project_idRoles_of_project'])
       qw['Stages_of_project_idStages_of_project']=b[ccd];
       console.log(qw['Stages_of_project_idStages_of_project'])
       qw['actual_credits']=0
       console.log(qw['actual_credits'])
       qw['credits']=stt[i].grades[ii][key]
       console.log(qw['credits'])

       db.query('INSERT INTO grade_for_stage  SET ?',
       qw, 
       function(err, rows, fields) {
       if (err) throw err
       console.log( "grades insert ok")
       })

       ccd=ccd+1;
     }

  }
}
    res.send("OK")
  });

  });

})

setInterval(function() {
  db.query('update projects set status_of_project=\"в процессе\" where ((beginning_date <= now()) AND status_of_project="согласован")',
  function(err, rows, fields) {
    if (err) throw err
   console.log("OK")
})}, 86400000)

setInterval(function() {
  db.query('update projects set status_of_project=\"завершен\" where ((ending_date <= now()) AND status_of_project="в процессе")',
  function(err, rows, fields) {
    if (err) throw err
   console.log("OK")
})}, 86400000)


setInterval(function() {
  var tempp=0;
  var t=[];
   db.query('select idProjects,project_name,status_of_project,beginning_date,ending_date,COUNT(*) AS "lala" from projects inner join roles_of_project on idProjects=roles_of_project.Projects_idProjects where status_of_role=\'свободно\' group by idProjects',function(err, row, field){
   tempp=row;
  for (var i=0;i<tempp.length;i++){
  t.push(tempp[i]['idProjects'])
  }
  console.log(t)
   db.query('update projects set status_of_project=\"в работе\" where idProjects not in (?) and status_of_project=\"в процессе\" ',[t],
   function(e, r, f){
    if (e) throw e
  console.log("sddddd")
  
   })
})}, 86400000)

//Выход из системы
app.get('/api/logout', function(req, res){
  req.logOut();
  res.status(200).clearCookie('connect.sid', {
    path: '/api/signin'
  });
  req.session.destroy((err)=> {
    if(err){console.log(err)}
    res.redirect('/api/signin')  
  });

});

