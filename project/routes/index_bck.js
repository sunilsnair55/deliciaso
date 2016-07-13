var express = require('express');
var router = express.Router();
// var fs = require("fs");
var nodemailer = require('nodemailer');
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database: 'deliciaso'
});
connection.connect(function(err) {
  if (err) throw err
  console.log('You are now connected...');
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});
router.get('/payment', function(req, res, next) {
  res.render('PaymentManagement');
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
  var Address = req.body.DeliveryAddress;
  var Billing = req.body.Billing;
  var Cake = req.body.Cake;
  var Brownie = req.body.Brownie;
    console.log(Billing);
  console.log(CustomerData);

  connection.query('SELECT Id FROM customers WHERE Mobile=?',[CustomerData.Mobile], function(err, doc){
    if (err)
     throw err;

    if(doc!=""&&doc!=null){
      if(doc.length=="1"){
        connection.query('UPDATE customers SET ? WHERE Mobile = ?',[CustomerData, CustomerData.Mobile],function(err1, doc1){
          if (err1)
           throw err1;

      if(Billing!=undefined)
      {
        Billing["DeliveryAddressId"] = "1";
        Billing["CustomerId"] = CustomerData.Id;
      }


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
                connection.query('INSERT INTO cakeorders SET ?', Cake[i], function(err3, doc3) {
                  if (err3)
                   throw err3;
                   res.send(doc3);
                });
              }
        });
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
          Billing["DeliveryAddressId"] = "1";
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

                    res.send(doc6);
              });
            }
          });
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

router.get('/GetOrderData', function(req, res, next) {
var mobile = req.params.mobile;
connection.query('SELECT Id FROM customers WHERE Mobile='+mobile, function(err, doc){
  if(doc!=""&&doc!=null)
  {
    var CustId = doc[0].Id;
    console.log(CustId);
    connection.query('SELECT customers.Id AS CustomerId,customers.Name,customers.Mobile,customers.Email, orders.Id AS OrderId,orders.DeliveryType,orders.DeliveryDate,orders.Comments AS OrderComments,orders.PickUpDate,cakeorders.PaymentStatus,cakeorders.DeliveryStatus,cakeorders.Id AS CakeOrderId, cakeorders.CakeName,cakeorders.Size,cakeorders.Shape,cakeorders.Type,cakeorders.Amount,cakeorders.Message,cakeorders.DecorationInstr,cakeorders.IngredientInstr,cakeorders.Occasion,cakeorders.Comments AS CakeOrderComments FROM customers INNER JOIN orders ON customers.Id=orders.CustomerId INNER JOIN cakeorders ON orders.Id=cakeorders.OrderId WHERE customers.Id='+CustId+' AND cakeorders.PaymentStatus="0"', function(err1, doc1){
      console.log(doc1);
      console.log(err1);
      res.send(doc1);
    });
  }
  else {
    res.json(doc);
  }
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


var Data = req.body;
var Id = req.body.Id;

  connection.query('UPDATE cakeorders SET ? WHERE Id = ?',[Data, Id],function(err, doc){
    if(err)
    throw err;

    res.send(doc);
  });

});

module.exports = router;
