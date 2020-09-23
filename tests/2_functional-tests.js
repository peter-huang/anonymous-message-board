/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');
var bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

chai.use(chaiHttp);

suite('Functional Tests', function() {

    /*
  * Encrypt plain text password to hash password
  *
  * @param plainTextPassword - plain text password
  * @param saltRounds - number of rounds to hash
  *
  * @return hashed password
  */
  const encryptPassword = (plainTextPassword, saltRounds) => {
    return bcrypt.hashSync(plainTextPassword, saltRounds);
  }



  /*
  * Checks if both passwords entered is the same as hashed password in the database
  *
  * @param plainTextPassword - plain text password
  * @param hashPassword - hashed password
  *
  * @return true if valid password, false otherwise
  */
  const isValidPassword = (plainTextPassword, hashPassword) => {
    return bcrypt.compareSync(plainTextPassword, hashPassword);

  }

  let board = "fcctest";
  let password = board;

  let testId_deleteCorrectPassword;
  let testId_deleteIncorrectPassword;
  let reply_id;

  suite('API ROUTING FOR /api/threads/:board', function() {
    
    suite('POST', function() {
      test('Create first thread', function(done) {
        chai.request(server)
        .post('/api/threads/' + board)
        .send({
          text:'This is a test(A) for the fcc curricumlum', delete_password: password
        })
        .end(function(err, res){
          if(err){
            done(err)
          }
          assert.equal(res.status, 200);
          done();
        });
      });


      test('Create second thread', function(done) {
        chai.request(server)
        .post('/api/threads/' + board)
        .send({
          text:'This is a test(B) for the fcc curricumlum', delete_password: password
        })
        .end(function(err, res){
          if(err){
            done(err)
          }
          assert.equal(res.status, 200);
          done();
        });
      });



    });
    
    suite('GET', function() {
            
      test('Most recent 10 threads with most recent 3 replies each', function(done) {
        chai.request(server)
        .get('/api/threads/' + board)
        .end(function(err,res){
          if(err){
            done(err)
          }
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          
          assert.equal(res.body.length, 10);
          assert.isBelow(res.body[0].replies.length, 4);
    
          
          testId_deleteCorrectPassword = res.body[0]._id;
          testId_deleteIncorrectPassword =res.body[1]._id;
          
          done()
        });
      });
    });
    
    suite('DELETE', function() {
      
      test('Delete thread with correct password', function(done) {
        chai.request(server)
        .delete('/api/threads/' + board)
        .send({thread_id: testId_deleteCorrectPassword, delete_password: password})
        .end(function (err, res){

          assert.equal(res.status, 200);
          assert.equal(res.text, 'success')
          done();
        })
      });

      test('Delete thread with incorrect password', function(done) {
        chai.request(server)
        .delete('/api/threads/' + board)
        .send({thread_id: testId_deleteIncorrectPassword, delete_password: ''})
        .end(function (err, res){
          assert.equal(res.status, 200);
          assert.equal(res.text, 'unsuccessful');
          done()
        });
          
      });
    });
    
    suite('PUT', function() {
      test('Report thread', function(done){
       chai.request(server)
        .put('/api/threads/' + board)
        .send({report_id: testId_deleteIncorrectPassword})
        .end(function(err,res){
          assert.equal(res.status, 200);
          assert.equal(res.text, 'success');
         done();
         })
      })
    });
    

  });
  
  suite('API ROUTING FOR /api/replies/:board', function() {
    
    suite('POST', function() {
      test('Create a new reply/post', function(done) {
        chai.request(server)
        .post('/api/replies/' + board)
        .send({
          thread_id: testId_deleteIncorrectPassword, 
          text: board, 
          delete_password: board
        })
        .end(function(err, res){
          assert.equal(res.status, 200);
          done();
        });
      });
    });
    
    suite('GET', function() {
      test('Get all replies for a thread', function(done) {
        chai.request(server)
        .get('/api/replies/' + board)
        .query({thread_id: testId_deleteIncorrectPassword})
        .end(function(err,res){
          assert.equal(res.status, 200);
          assert.isArray(res.body.replies)
          reply_id = res.body.replies[0]._id;

          done();
        });
      });
    });
    
    suite('PUT', function() {
      
      test('Report reply/post', function(done) {
        chai.request(server)
        .put('/api/threads/' + board)
        .send({
          thread_id: testId_deleteIncorrectPassword, 
          reply_id: reply_id
        })
        .end(function(err, res){
          assert.equal(res.status, 200);
          assert.equal(res.text, 'success');
          done();
        });
      });  
      
    });
    
    suite('DELETE', function() {

      test('Unsuccessfully delete reply/post', function(done) {
        chai.request(server)
        .delete('/api/threads/' + board)
        .send({
          thread_id: testId_deleteIncorrectPassword, 
          reply_id:reply_id, 
          delete_password: ''
        })
        .end(function(err, res){
          assert.equal(res.status, 200);
          assert.equal(res.text, 'unsuccessful');
          done();
        });
      });  


      test('Successfully delete reply/post', function(done) {
        chai.request(server)
        .delete('/api/threads/' + board)
        .send({
          thread_id: testId_deleteIncorrectPassword, 
          reply_id:reply_id, 
          delete_password: board
        })
        .end(function(err, res){
          assert.equal(res.status, 200);
          assert.equal(res.text, 'success');
          done();
        });
      }); 
      
    });
    
  });

});
