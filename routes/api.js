/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect             = require('chai').expect;
var mongoDbUtilities   = require('./../mongodb-util');
const ObjectID = require("mongodb").ObjectID;

module.exports = function (app) {
  
  // Boards
  app.route('/api/threads/:board')
  .get(function(req, res){
    console.log("/api/threads/:board GET");

    const board = req.params.board;

    if(board != undefined && board != null){
      
      mongoDbUtilities.connectToServer(state =>{
        if(state.status){
          mongoDbUtilities.getBoard(board, callback =>{
            if(callback.status){
              res.json(callback.result.thread)
            }else{
               res.send("unsuccessful");
            }
          })
        }else{
          res.send("unsuccessful");
        }
      })
    }else{
      res.send("invalid query");
    }


  })
  .post(function(req, res){
    console.log("/api/threads/:board POST");

    let board = req.body;
    board.board = req.params.board;

    mongoDbUtilities.connectToServer(state =>{
      if(state.status){
        mongoDbUtilities.queryBoard(board, callback =>{
          if(callback.status){
    
            res.redirect("/b/" + callback.result.board + "/");    
          }else{
            res.send("unsuccessful");
          }
        })
      }else{
          res.send("unsuccessful");
      }
    })
  })
  .put(function(req, res){
    console.log("/api/threads/:board PUT");

    let board = {
      board : req.params.board
    }

    if(req.body.hasOwnProperty("thread_id")){
      board.thread_id = req.body.thread_id
    }else{
      board.thread_id = req.body.report_id
    }
  
    if(!ObjectID.isValid(board.thread_id)){
      res.send("unsuccessful");
    }else{
 
      mongoDbUtilities.connectToServer(state =>{
        if(state.status){
          mongoDbUtilities.reportThread(board, callback =>{
            callback.status ? res.send("success") : res.send("unsuccessful")
          })
        }else{
          res.send("unsuccessful");
        }
      })
    }
  })
  .delete(function(req, res){
    console.log("/api/threads/:board DELETE");

    let board = req.body;
    board.board = req.params.board


    if(!ObjectID.isValid(board.thread_id)){
      res.send("unsuccessful");
    }else{
      mongoDbUtilities.connectToServer(state =>{
        if(state.status){
          mongoDbUtilities.deleteThread(board, callback =>{
            callback.status ? res.send("success") : res.send("unsuccessful")
          })
        }else{
          res.send("unsuccessful");
        }
      })
    }

  });
    

  // Replies
  app.route('/api/replies/:board')
  .get(function(req, res){
    console.log("/api/replies/:board GET");

    let thread = req.query;
    thread.board = req.params.board;

    if(!ObjectID.isValid(thread.thread_id)){
      res.send("unsuccessful");
    }else{
      mongoDbUtilities.connectToServer(state =>{
        if(state.status){
          mongoDbUtilities.getThread(thread, callback =>{
            res.json(callback.result);
          })
        }else{
          res.send("unsuccessful");
        }
      })
    }
  })
  .post(function(req, res){
    console.log("/api/replies/:board POST");
    
    let post = req.body;
    post.board = req.params.board

    if(!ObjectID.isValid(post.thread_id)){
      res.send("unsuccessful");
    }else{
      mongoDbUtilities.connectToServer(state =>{
        if(state.status){
          mongoDbUtilities.addPost(post, callback =>{
           
            if(callback.status){
              res.redirect("/b/" + post.board + "/" + callback.result._id + "/");
            }else{
              res.send("unsuccessful");
            }
           
          })
        }else{
          res.send("unsuccessful");
        }
      })
    }
  })
  .put(function(req, res){
    console.log("/api/replies/:board PUT");

    let post = req.body;
    post.board = req.params.board;

    if(!ObjectID.isValid(post.thread_id) || !ObjectID.isValid(post.reply_id)){
      res.send("unsuccessful");
    }else{
      mongoDbUtilities.connectToServer(state =>{
        if(state.status){
          mongoDbUtilities.reportPost(post, callback =>{
            callback.status ? res.send("success") : res.send("unsuccessful")
          })
        }else{
          res.send("unsuccessful");
        }
      })
    }
  })
  .delete(function(req, res){
    console.log("/api/replies/:board DELETE");

    let post = req.body;
    post.board = req.params.board;

    if(!ObjectID.isValid(post.thread_id) || !ObjectID.isValid(post.reply_id)){
      res.send("unsuccessful");
    }else{
      mongoDbUtilities.connectToServer(state =>{
        if(state.status){
          mongoDbUtilities.deletePost(post, callback =>{
            callback.status ? res.send("success") : res.send("unsuccessful")
          })
        }else{
          res.send("unsuccessful");
        }
      })
    }  
  });

};
