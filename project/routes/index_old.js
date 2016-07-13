var util = require('util');
var express = require('express');
var expressValidator = require('express-validator');
var app = express();

var cookieParser = require('cookie-parser');
var router = express.Router();
var nodemailer = require('nodemailer');
var mysql      = require('mysql');
// var connection = mysql.createConnection({
//   host     : 'ngo.aguaisolutions.com',
//   user     : 'aguaivgq_ngo',
//   password : 'Welc0me!23',
//   database: 'aguaivgq_deliciaso'
// });
// app.use(methodOverride());
var bodyParser = require('body-parser');
// app.use(expressValidator());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.bodyParser());
// app.use(expressValidator());
 router.use(bodyParser.json());
 router.use(bodyParser.urlencoded({ extended: true }));
 router.use(expressValidator());


// connection.connect(function(err) {
//   if (err) throw err
//   console.log('You are now connected...');
// });


var db_config = {
  host     : 'ngo.aguaisolutions.com',
  user     : 'aguaivgq_ngo',
  password : 'Welc0me!23',
  database: 'aguaivgq_deliciaso'
};

var connection;

function handleDisconnect() {
  connection = mysql.createConnection(db_config); // Recreate the connection, since
                                                  // the old one cannot be reused.

  connection.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  connection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}

handleDisconnect();





/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('login');
});
router.get('/order', function(req, res, next) {
  res.render('index');
});
router.get('/payment', function(req, res, next) {
  res.render('PaymentManagement');
});

router.get('/TestRemote', function(req, res, next) {
  connection.query('SELECT * from coupon', function(err, doc){
    if(err)
    throw err;

    res.send(doc)
});
});

router.get('/:mobile', function(req, res, next) {
var mobile = req.params.mobile;
connection.query('SELECT Id,Name,Mobile,Email,Gender,Address,Zip FROM customers WHERE Mobile='+mobile, function(err, doc){
  if(doc!=""&&doc!=null)
  {
    var CustomerId = doc[0].Id;
    connection.query('SELECT DeliveryAddress,Zip,CustomerId FROM deliveryaddress WHERE CustomerId='+CustomerId, function(err1, doc1){
      connection.query('SELECT Id,Name AS CakeName,Size,Quantity,Shape,Type,Message,Amount,DecorationInstr,IngredientInstr,OrderDate,DeliveryDate,Occasion,Comments FROM cakeorder WHERE CustomerId='+CustomerId, function(err2, doc2){
      res.send({"Customer":doc,"DeliveryAddress":doc1,"LastCakeOrders":doc2});
      });

    });
  }
  else {
    res.json(doc);
  }
  });
});


router.put('/:Id', function(req, res, next) {
var Id = req.params.Id;
var Data = req.body;

connection.query('UPDATE cakeorder SET ? WHERE Id = ?',[{ Name: Data.CakeName,Size:Data.Size,Quantity:Data.Quantity,Shape:Data.Shape,Type:Data.Type,Amount:Data.Amount,Message:Data.Message,DecorationInstr:Data.DecorationInstr,IngredientInstr:Data.IngredientInstr,OrderDate:Data.OrderDate,DeliveryDate:Data.DeliveryDate,Occasion:Data.Occasion,Comments:Data.Comments }, Id],function(err, doc){
  if(doc!=""&&doc!=null)
  {
    connection.query('SELECT Id,Name AS CakeName,Size,Quantity,Shape,Type,Message,Amount,DecorationInstr,IngredientInstr,OrderDate,DeliveryDate,Occasion,Comments FROM cakeorder WHERE Id='+Id, function(err2, doc2){
    res.json(doc2)
    });
  }
  else
  {
    console.log(err);
  }
});

});

router.get('/GetReferedByData/:ReferedBy', function(req, res, next) {
var Data = req.params.ReferedBy;
if(Data!=""&&Data!=null&&Data!=undefined)
{
  connection.query('SELECT Id,Name,Mobile,Email FROM customers WHERE Name LIKE ? OR Mobile LIKE ? OR Email LIKE ?',['%' + Data + '%','%' + Data + '%','%' + Data + '%'], function(err, doc){
    res.json(doc);
    });
}
});

router.post('/QuickSave', function(req, res, next) {
  var CustomerData = req.body;
connection.query('SELECT Id FROM customers WHERE Mobile=?',[CustomerData.Mobile], function(err, doc){
  if (err)
   throw err;
   if(doc==""||doc==null){
     connection.query('INSERT INTO customers SET ?', CustomerData, function(err1, doc1) {
       if(doc1!=null&&doc1!="")
       {
         res.send({"Message":"New customer added."});
       }
     });

   }
   else
   {
    res.send({"Message":"Customer already exist."});
   }
});
});

router.post('/PlaceOrder', function(req, res, next) {

  var CustomerData = req.body.cust;
  var FinalDeliveryAddress = req.body.FinalDeliveryAddress;
  var Billing = req.body.Billing;
  var Cake = req.body.Cake;
  var Brownie = req.body.Brownie;
  var payment = [];
  console.log(req.body);
    console.log(FinalDeliveryAddress);

  connection.query('SELECT Id FROM customers WHERE Mobile=?',[CustomerData.Mobile], function(err, doc){
    if (err)
     throw err;

    if(doc!=""&&doc!=null){
      if(doc.length=="1"){

        connection.query('UPDATE customers SET ? WHERE Mobile = ?',[CustomerData, CustomerData.Mobile],function(err1, doc1){
          if (err1)
           throw err1;

      if(FinalDeliveryAddress.Status == "1")
      {
        Billing["DeliveryAddressId"] = FinalDeliveryAddress.DeliveryAddress;
        Billing["CustomerId"] = CustomerData.Id;
        connection.query('INSERT INTO orders SET ?', Billing, function(err2, doc2) {
          if (err2)
           throw err2;

            var OrderId = doc2.insertId;
            var InsertCakeData;
            for (var i=0;i<Cake.length;i++)
            {
              Cake[i]["PaymentStatus"] ="0";
              Cake[i]["DeliveryStatus"]="0";
              Cake[i]["CustomerId"] = CustomerData.Id;
              Cake[i]["OrderId"] = OrderId;
              console.log(Cake[i]["Amount"]);

              connection.query('INSERT INTO cakeorders SET ?', Cake[i], function(err3, doc3) {
                if (err3)
                 throw err3;
                 payment[i] ={'PaymentStatus':'0','CakeOrderId':doc3.insertId};
                 connection.query('INSERT INTO payments SET ?',payment[i], function(err8, doc8) {
                   res.send(doc8);

                 });

              });
            }
      });
      }
      else
      {
        var NewAddress = {"DeliveryAddress":FinalDeliveryAddress.DeliveryAddress,"CustomerId":CustomerData.Id};
      connection.query('INSERT INTO deliveryaddress SET ?', NewAddress, function(error, docs) {
console.log(docs);
          Billing["DeliveryAddressId"] = docs.insertId;
          Billing["CustomerId"] = CustomerData.Id;
          connection.query('INSERT INTO orders SET ?', Billing, function(err2, doc2) {
            if (err2)
             throw err2;

              var OrderId = doc2.insertId;
              var InsertCakeData;
              for (var i=0;i<Cake.length;i++)
              {
                Cake[i]["PaymentStatus"] ="0";
                Cake[i]["DeliveryStatus"]="0";
                Cake[i]["CustomerId"] = CustomerData.Id;
                Cake[i]["OrderId"] = OrderId;
                console.log(Cake[i]["Amount"]);

                connection.query('INSERT INTO cakeorders SET ?', Cake[i], function(err3, doc3) {
                  if (err3)
                   throw err3;
                   payment[i] ={'PaymentStatus':'0','CakeOrderId':doc3.insertId};
                   connection.query('INSERT INTO payments SET ?',payment[i], function(err8, doc8) {
                     res.send(doc8);

                   });

                });
              }
        });
        });
      }



        });
      }
      else{
        res.send("No Records found");
      }
    }
    else{
      connection.query('INSERT INTO customers SET ?', CustomerData, function(err4, doc4) {
        if (err4)
         throw err4;

          var CustomerId = doc4.insertId;

          if(FinalDeliveryAddress.Status == "1")
          {
            Billing["DeliveryAddressId"] = FinalDeliveryAddress.DeliveryAddress;
            Billing["CustomerId"] = CustomerId;
            connection.query('INSERT INTO orders SET ?', Billing, function(err5, doc5) {
              if (err5)
               throw err5;

              var OrderId1 = doc5.insertId;
              var InsertCakeData1;
              for (var i=0;i<Cake.length;i++)
              {
                Cake[i]["PaymentStatus"] ="0";
                Cake[i]["DeliveryStatus"]="0";
                Cake[i]["CustomerId"] = CustomerId;
                Cake[i]["OrderId"] = OrderId1;
                connection.query('INSERT INTO cakeorders SET ?', Cake[i], function(err6, doc6) {
                  if (err6)
                   throw err6;

                   payment[i] ={'PaymentStatus':'0','CakeOrderId':doc6.insertId};
                   connection.query('INSERT INTO payments SET ?',payment[i], function(err7, doc7) {
                     res.send(doc6);

                   });
                });
              }
            });
          }
          else
          {
            var NewAddress = {"DeliveryAddress":FinalDeliveryAddress.DeliveryAddress,"CustomerId":CustomerId};
            connection.query('INSERT INTO deliveryaddress SET ?', NewAddress, function(error, docs) {
    console.log(docs);
              Billing["DeliveryAddressId"] = docs.insertId;
              Billing["CustomerId"] = CustomerId;
              connection.query('INSERT INTO orders SET ?', Billing, function(err5, doc5) {
                if (err5)
                 throw err5;

                var OrderId1 = doc5.insertId;
                var InsertCakeData1;
                for (var i=0;i<Cake.length;i++)
                {
                  Cake[i]["PaymentStatus"] ="0";
                  Cake[i]["DeliveryStatus"]="0";
                  Cake[i]["CustomerId"] = CustomerId;
                  Cake[i]["OrderId"] = OrderId1;
                  connection.query('INSERT INTO cakeorders SET ?', Cake[i], function(err6, doc6) {
                    if (err6)
                     throw err6;

                     payment[i] ={'PaymentStatus':'0','CakeOrderId':doc6.insertId};
                     connection.query('INSERT INTO payments SET ?',payment[i], function(err7, doc7) {
                       res.send(doc6);

                     });
                  });
                }
              });
            });
          }


    });
    }
  });

});

// router.get('/GetOrderData/:mobile', function(req, res, next) {
// var mobile = req.params.mobile;
// connection.query('SELECT Id FROM customers WHERE Mobile='+mobile, function(err, doc){
//   if(doc!=""&&doc!=null)
//   {
//     var CustId = doc[0].Id;
//     console.log(CustId);
//     connection.query('SELECT customers.Id AS CustomerId,customers.Name,customers.Mobile,customers.Email, orders.Id AS OrderId,orders.DeliveryType,orders.DeliveryDate,orders.Comments AS OrderComments,orders.PickUpDate,cakeorders.PaymentStatus,cakeorders.DeliveryStatus,cakeorders.Id AS CakeOrderId, cakeorders.CakeName,cakeorders.Size,cakeorders.Shape,cakeorders.Type,cakeorders.Amount,cakeorders.Message,cakeorders.DecorationInstr,cakeorders.IngredientInstr,cakeorders.Occasion,cakeorders.Comments AS CakeOrderComments FROM customers INNER JOIN orders ON customers.Id=orders.CustomerId INNER JOIN cakeorders ON orders.Id=cakeorders.OrderId WHERE customers.Id='+CustId+' AND cakeorders.PaymentStatus="0"', function(err1, doc1){
//       console.log(doc1);
//       console.log(err1);
//       res.send(doc1);
//     });
//   }
//   else {
//     res.json(doc);
//   }
//   });
// });

router.get('/GetOrderData/:api', function(req, res, next) {
    connection.query("SELECT customers.Id AS CustomerId,customers.Name,customers.Mobile,customers.Email,customers.Gender,customers.Address,customers.Zip, orders.Id AS OrderId,orders.DeliveryType,orders.DeliveryDate,orders.Comments AS OrderComments,orders.PickUpDate,payments.PaymentStatus,cakeorders.DeliveryStatus,cakeorders.Id AS CakeOrderId, cakeorders.CakeName,cakeorders.Size,cakeorders.Shape,cakeorders.Type,cakeorders.Amount,cakeorders.Message,cakeorders.DecorationInstr,cakeorders.IngredientInstr,cakeorders.Occasion,cakeorders.Comments AS CakeOrderComments, payments.PaidAmount FROM customers INNER JOIN orders ON customers.Id=orders.CustomerId INNER JOIN cakeorders ON orders.Id=cakeorders.OrderId INNER JOIN payments ON cakeorders.Id=payments.Id WHERE payments.PaymentStatus='0'", function(err, doc){
      if(err)
      throw err;
      connection.query("SELECT customers.Id AS CustomerId,customers.Name,customers.Mobile,customers.Email,customers.Gender,customers.Address,customers.Zip, orders.Id AS OrderId,orders.DeliveryType,orders.DeliveryDate,orders.Comments AS OrderComments,orders.PickUpDate,payments.PaymentStatus,cakeorders.DeliveryStatus,cakeorders.Id AS CakeOrderId, cakeorders.CakeName,cakeorders.Size,cakeorders.Shape,cakeorders.Type,cakeorders.Amount,cakeorders.Message,cakeorders.DecorationInstr,cakeorders.IngredientInstr,cakeorders.Occasion,cakeorders.Comments AS CakeOrderComments, payments.PaidAmount FROM customers INNER JOIN orders ON customers.Id=orders.CustomerId INNER JOIN cakeorders ON orders.Id=cakeorders.OrderId  INNER JOIN payments ON cakeorders.Id=payments.Id WHERE  payments.PaymentStatus='1'", function(err1, doc1){
        if(err1)
        throw err1;
        connection.query("SELECT customers.Id AS CustomerId,customers.Name,customers.Mobile,customers.Email,customers.Gender,customers.Address,customers.Zip, orders.Id AS OrderId,orders.DeliveryType,orders.DeliveryDate,orders.Comments AS OrderComments,orders.PickUpDate,payments.PaymentStatus,cakeorders.DeliveryStatus,cakeorders.Id AS CakeOrderId, cakeorders.CakeName,cakeorders.Size,cakeorders.Shape,cakeorders.Type,cakeorders.Amount,cakeorders.Message,cakeorders.DecorationInstr,cakeorders.IngredientInstr,cakeorders.Occasion,cakeorders.Comments AS CakeOrderComments, payments.PaidAmount FROM customers INNER JOIN orders ON customers.Id=orders.CustomerId INNER JOIN cakeorders ON orders.Id=cakeorders.OrderId  INNER JOIN payments ON cakeorders.Id=payments.Id WHERE payments.PaymentStatus='2'", function(err2, doc2){
          if(err2)
          throw err2;
          res.send({"Pending":doc,"Partial":doc1,"Completed":doc2});
        });
      });

    });
  });






router.post('/TestMail',function(){

    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'sunilsnair55@gmail.com',
            pass: 'Adthmaram@54321'
        }
    });

    var mailOptions = {
      from: 'sunilsnair55@gmail.com',
      to: 'sunilsnair55@gmail.com,sunilsnair321@gmail.com',
      subject: 'New Example',
      text: 'Hello World New'
      // html: '<b>Hello world ✔</b>' // You can choose to send an HTML body instead
  }


  transporter.sendMail(mailOptions, function(error, info){
        if(error){
        res.send(error);
        }else{
            res.send(info);
        };
    });

});

router.post('/MakePayment',function(req, res, next){
console.log(req.body);
  connection.query('UPDATE payments SET ? WHERE CakeOrderId = ?',[req.body, req.body.CakeOrderId],function(err, doc){
    if(err)
    throw err;
    res.send(doc);
  });
});

 router.post('/ValidateCustomerData',function(req, res, next){
console.log("here");
  console.log(req.body);
req.check('Name','Name is mandatory').notEmpty();
var errors = req.validationErrors();
if (errors) {
  res.send(errors,200);
  return;
}
else
{
  res.send(errors,200);
}

});
router.post('/ValidateCakeOrder',function(req,res){

  req.check('CakeName','Flavour Name is mandatory').notEmpty();
  // req.check('CakeName','Special characters are not allowed for cake flavour').isAlpha();
  req.check('CakeName','Alphanumeric characters are not allowed for cake flavour').isAlphanumeric();
  req.check('CakeName','Maximum character(Max.50) limit exceeded for cake flavour.').isLength({min:0, max: 50})

  req.check('Type','Type is mandatory').notEmpty();
  req.check('Type','Special characters are not allowed for Cake Type').isAlpha();

  req.check('Shape','Shape is mandatory').notEmpty();
  req.check('Shape','Special characters are not allowed for Shape').isAlpha();

  req.check('Amount','Amount is mandatory').notEmpty();
  req.check('Amount','Only integers are allowed for Amount.').isInt();

  req.check('Occasion','Special characters are not allowed for Occasion').isAlpha();

  // req.check('DeliveryType','Delivery Type  is mandatory').notEmpty();
  // if(req.body.DeliveryType =="DoorDelivery")
  // {
  //   req.check('DeliveryDate','DeliveryDate is mandatory').notEmpty();
  //   req.check('DeliveryAddress','DeliveryAddress is mandatory').notEmpty();
  // }
  // else {
  //     req.check('PickUpDate','PickUpDate is mandatory').notEmpty();
  // }

  var errors = req.validationErrors();
  if (errors) {
    res.send(errors,200);
    return;
  }
  else
  {
    res.send(errors,200);
  }
});

router.post('/ValidatePendingPayment',function(req,res){

  var errors = req.validationErrors();
  if (errors) {
    res.send(errors,200);
    return;
  }
  else
  {
    res.send(errors,200);
  }
});

module.exports = router;
