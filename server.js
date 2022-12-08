const express = require("express");
const MongoClient = require("mongodb").MongoClient;
const moment = require("moment");
const momentTimezone = require("moment-timezone");

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const multer  = require('multer');

const app = express();
const port = process.env.PORT || 8080;

app.set("view engine","ejs");
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));
app.use(session({secret : 'secret', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

MongoClient.connect("mongodb+srv://admin:qwer1234@portfolio2.xtnd3zm.mongodb.net/?retryWrites=true&w=majority",function(err,result){
    //에러가 발생했을경우 메세지 출력(선택사항)
    if(err) { return console.log(err); }

    //위에서 만든 db변수에 최종연결 ()안에는 mongodb atlas 사이트에서 생성한 데이터베이스 이름
    db = result.db("portfolio2");

    //db연결이 제대로 됬다면 서버실행
    app.listen(port,function(){
        console.log("서버연결 성공");
    });

});


//  /loginresult 경로 요청시 passport.autenticate() 함수구간이 아이디 비번 로그인 검증구간
passport.use(new LocalStrategy({
    usernameField: 'admid',
    passwordField: 'admpass',
    session: true,
    passReqToCallback: false,
  }, function (admid, admpass, done) {
    // console.log(userid, userpass);
    db.collection('user').findOne({ admid: admid }, function (err, result) {
      if (err) return done(err)
  
      if (!result) return done(null, false, { message: '존재하지않는 아이디 입니다.' })
      if (admpass == result.admpass) {
        return done(null, result)
      } else {
        return done(null, false, { message: '비번이 틀렸습니다' })
      }
    })
  }));


  //처음 로그인 했을 시 해당 사용자의 아이디를 기반으로 세션을 생성함
  //  req.user
  passport.serializeUser(function (user, done) {
    done(null, user.admid) //서버에다가 세션만들어줘 -> 사용자 웹브라우저에서는 쿠키를 만들어줘
  });
  
  // 로그인을 한 후 다른 페이지들을 접근할 시 생성된 세션에 있는 회원정보 데이터를 보내주는 처리
  // 그전에 데이터베이스 있는 아이디와 세션에 있는 회원정보중에 아이디랑 매칭되는지 찾아주는 작업
  passport.deserializeUser(function (admid, done) {
      db.collection('user').findOne({admid:admid }, function (err,result) {
        done(null, result);
      })
  }); 

const storage = multer.diskStorage({
destination: function (req, file, cb) {
    cb(null, 'public/upload')
},
filename : function(req, file, cb){
    cb(null, file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8') )
  }
})
const upload = multer({ storage: storage })

app.get("/",function(req,res){
    res.render("index");
});

//메인페이지 get 요청
app.get("/coffee",function(req,res){
    db.collection("admprd").find({prdcategory:"커피"}).toArray(function(err,result){
        res.render("coffee",{prdData:result});
    });
});

app.get("/cookie",function(req,res){
    db.collection("admprd").find({prdcategory:"쿠키"}).toArray(function(err,result){
        res.render("cookie",{prdData:result});
    });
});


//관리자 화면 로그인 페이지
app.get("/admin",function(req,res){
    res.render("adm-login");
});

//로그아웃 경로 get 요청
app.get("/logout",function(req,res){
    req.session.destroy(function(err){ // 요청 -> 세션제거
        res.clearCookie("connect.sid"); // 응답 -> 본인접속 웹브라우저 쿠키 제거
        res.redirect("/admin");
    });
});

//로그인 성공시 관리자 상품등록 페이지로 이동
app.post("/loginresult",passport.authenticate('local', {failureRedirect : '/fail'}),function(req,res){
    res.redirect("/adm/admprd");
})

//관리자 상품등록 페이지
app.get("/adm/admprd",function(req,res){
    db.collection("admprd").find({}).toArray(function(err,result){
        res.render("adm-prd",{prdData:result,userData:req.user});
    });
});

//관리자 상품등록 db처리
app.post("/addprd",upload.single('image'),function(req,res){
    if(req.file){
        fileTest = req.file.originalname;
    }
    else{
        fileTest = null;
    }
    db.collection("count").findOne({name:"상품등록"},function(err,result1){
        db.collection("admprd").insertOne({
            prdid:result1.prdCount + 1,
            prdname:req.body.name,
            prdfile:fileTest,
            prdcategory:req.body.category,
            prddate:moment().tz("Asia/Seoul").format("YYYY-MM-DD HH:mm:ss")
        },function(err,result){
            db.collection("count").updateOne({name:"상품등록"},{$inc:{prdCount:1}},function(err,result){
                res.redirect("/adm/admprd"); //게시글 작성 후 게시글 목록경로 요청
            });
        });
    });
});

//관리자 매장등록 페이지
app.get("/adm/local",function(req,res){
    db.collection("admlocal").find({}).toArray(function(err,result){
        res.render("adm-local",{localData:result,userData:req.user});
    });
});


//관리자 매장등록 db처리
app.post("/addlocal",function(req,res){
  
    db.collection("count").findOne({name:"지역정보"},function(err,result1){
        db.collection("admlocal").insertOne({
            num:result1.localCount + 1,
            name:req.body.name,
            locale:req.body.city1,
            sublocale:req.body.city2,
            address:req.body.sample6_address,
            phone:req.body.phone
        },function(err,result){
            db.collection("count").updateOne({name:"지역정보"},{$inc:{localCount:1}},function(err,result){
                res.redirect("/adm/local"); //게시글 작성 후 게시글 목록경로 요청
            });
        });
    });
});



//사용자가 보는 매장페이지
app.get("/local",function(req,res){
    db.collection("admlocal").find({}).toArray(function(err,result){
        res.render("local",{localData:result});
    });
});


// url주소에 get요청으로 보내준 데이터값 확인?
app.get("/search/area",function(req,res){

    if(req.query.city1 !== "" && req.query.city2 === ""){
        db.collection("admlocal").find({locale:req.query.city1}).toArray(function(err,result){
            console.log(result);
            res.render("local",{localData:result});
        });
    }
    // 도/시 군/구 선택 시
    else if(req.query.city1 !== "" && req.query.city2 !== ""){
        db.collection("admlocal").find({locale:req.query.city1,sublocale:req.query.city2}).toArray(function(err,result){
            console.log(result);
            res.render("local",{localData:result});
        });
    }
    else {
        res.redirect("/local");
    }
});

app.get("/search/storename",function(req,res){
    
    let test = [
        {
          $search: {
            index: 'search',
            text: {
              query:req.query.name,
              path:"name"
            }
          },
        },
    ]
    // 검색어 입력시
    if(req.query.name !== ""){
        db.collection("admlocal").aggregate(test).toArray(function(err,result){
            console.log(result);
            res.render("local",{localData:result});
        });
    }
    //아무것도 선택하지않고 검색어 입력도 없을 시
    else {
        res.redirect("/local");
    }
});



