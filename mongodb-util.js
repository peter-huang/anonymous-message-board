"use strict";

const mongo = require("mongodb");
const ObjectID = require("mongodb").ObjectID;
const bcrypt = require("bcrypt");

var _db;
const collection = "messageboard";
const saltRounds = 10;
const NUM_OF_REPLIES = 3;
const NUM_OF_THREADS = 10;
module.exports = {
  /*
   * Connects to the database
   *
   * @return callback - status message
   */
  connectToServer: function (callback) {
    mongo.connect(
      process.env.DB,
      { useNewUrlParser: true, useUnifiedTopology: true },
      (err, client) => {
        _db = client.db("<dbname>");
        err
          ? callback({ status: false, message: err })
          : callback({
              status: true,
              message: "Successfully connected to database",
            });
      }
    );
  },

  /*
   * Returns the database object
   *
   */
  getDb: function () {
    return _db;
  },

  /*
   * Gets the thread
   *
   * @param thread - thread with thread_id and board name
   *
   * @return callback - specified thread
   */
  getThread: function (thread, callback) {
    _db.collection(collection).findOne(
      {
        board: thread.board,
      },
      (err, res) => {
        if (err) {
          console.log(err);
          callback({ status: false });
        } else {
          let threadFound;

          // clean out password, refactor with projection in future
          for (let i = 0; i < res.thread.length; i++) {
            if (res.thread[i]._id == thread.thread_id) {
              delete res.thread[i].delete_password;
              /*
            res.thread[i].created_on = this.convertDateToString(res.thread[i].created_on);*/

              for (let j = 0; j < res.thread[i].replies.length; j++) {
                delete res.thread[i].replies[j].delete_password;
                /*
              res.thread[i].replies[j].created_on = this.convertDateToString(res.thread[i].replies[j].created_on)*/
              }
              threadFound = res.thread[i];
            }
          }

          callback({ status: true, result: threadFound });
        }
      }
    );
  },

  /*
   * Removes a post
   *
   * @param post - post database
   *
   * @return callback with
   */
  deletePost: function (post, callback) {
    const { thread_id, reply_id } = post;

    _db.collection(collection).findOne({ board: post.board }, (err, res) => {
      if (err) {
        console.log(err);
        callback({ status: false });
      } else {
        // valid board
        if (res != null) {
          const threads = res.thread;
          let repliesLength = 0;

          let validPasswordEntered = false;

          // check for valid post and password
          for (let i = 0; i < threads.length; i++) {
            if (threads[i]._id == thread_id) {
              const replies = threads[i].replies;
              repliesLength = replies.length;

              for (let j = 0; j < replies.length; j++) {
                if (
                  replies[j]._id == reply_id &&
                  replies[j].delete_password == post.delete_password
                ) {
                  repliesLength = replies.length - 1;

                  validPasswordEntered = true;
                }
              }
            }
          }

          if (validPasswordEntered) {
            // remove post and reduce reply counter by 1
            _db.collection(collection).updateOne(
              {
                board: post.board,
                thread: {
                  $elemMatch: {
                    _id: ObjectID(thread_id),
                    "replies._id": ObjectID(reply_id),
                  },
                },
              },
              {
                $set: {
                  "thread.$[outer].replycount": repliesLength,
                  "thread.$[outer].replies.$[inner].text": "[deleted]",
                },
                /*
              $pull : { 'thread.$[outer].replies' : {_id :ObjectID(reply_id), delete_password: post.delete_password }}*/
              },
              {
                arrayFilters: [
                  { "outer._id": ObjectID(thread_id) },
                  { "inner._id": ObjectID(reply_id) },
                ],
              },
              (err, res) => {
                if (err) {
                  console.log(err);
                  callback({ status: false });
                } else {
                  res.modifiedCount === 0
                    ? callback({ status: false })
                    : callback({ status: true });
                }
              }
            );
          } else {
            callback({ status: false });
          }
        } else {
          callback({ status: false });
        }
      }
    });
  },

  /*
   * Reports a post
   *
   * @param post - post database
   *
   * @return callback with
   */
  reportPost: function (post, callback) {
    const { thread_id, reply_id } = post;

    _db.collection(collection).updateOne(
      {
        board: post.board,
        thread: {
          $elemMatch: {
            _id: ObjectID(thread_id),
            "replies._id": ObjectID(reply_id),
          },
        },
      },
      {
        $set: { "thread.$[outer].replies.$[inner].reported": true },
      },
      {
        arrayFilters: [
          { "outer._id": ObjectID(thread_id) },
          { "inner._id": ObjectID(reply_id) },
        ],
      },
      (err, res) => {
        if (err) {
          console.log(err);
          callback({ status: false });
        } else {
          res.matchedCount === 0
            ? callback({ status: false })
            : callback({ status: true });
        }
      }
    );
  },

  /*
   * Adds a post to a thread
   *
   * @param post - post database
   *
   * @return callback with
   */
  addPost: function (post, callback) {
    _db.collection(collection).findOne({ board: post.board }, (err, res) => {
      if (err) {
        console.log(err);
        callback({ status: false });
      } else {
        if (res != null) {
          const newDate = new Date();
          let arrayLength = 0;

          // get array length
          for (let i = 0; i < res.thread.length; i++) {
            if (res.thread[i]._id == post.thread_id) {
              arrayLength = res.thread[i].replies.length;
            }
          }

          _db.collection(collection).findOneAndUpdate(
            {
              board: post.board,
              thread: {
                $elemMatch: {
                  _id: ObjectID(post.thread_id),
                },
              },
            },
            {
              $push: {
                "thread.$.replies": {
                  _id: ObjectID(),
                  created_on: newDate,
                  reported: false,
                  text: post.text,
                  delete_password: post.delete_password,
                },
              },
              $set: {
                "thread.$.bumped_on": newDate,
                "thread.$.replycount": arrayLength + 1,
              },
            },
            { returnOriginal: false },
            (err, res) => {
              if (err) {
                console.log(err);
                callback({ status: false });
              } else {
                if (res.value != null) {
                  let r;
                  for (let i = 0; i < res.value.thread.length; i++) {
                    if (res.value.thread[i]._id == post.thread_id) {
                      r = res.value.thread[i];
                    }
                  }

                  callback({ status: true, result: r });
                } else {
                  callback({ status: false });
                }
              }
            }
          );
        } else {
          callback({ status: false });
        }
      }
    });
  },

  /*
   * Delete a thread
   *
   * @param post - board containing thread id and thread password
   *
   * @return callback true or false for successfully removed or otherwise
   */
  deleteThread: function (board, callback) {
    _db.collection(collection).updateOne(
      {
        board: board.board,
        thread: {
          $elemMatch: {
            _id: ObjectID(board.thread_id),
            delete_password: board.delete_password,
          },
        },
      },
      {
        $pull: { thread: { _id: ObjectID(board.thread_id) } },
      },
      (err, res) => {
        if (err) {
          console.log(err);
          callback({ status: false });
        } else {
          res.matchedCount === 0
            ? callback({ status: false })
            : callback({ status: true });
        }
      }
    );
  },

  /*
   * Report thread
   *
   * @param board - a boarn object with .board name proeprty and thread_id
   *
   * @returns callback message
   */
  reportThread: function (board, callback) {
    _db.collection(collection).updateOne(
      {
        board: board.board,
        thread: {
          $elemMatch: {
            _id: ObjectID(board.thread_id),
          },
        },
      },
      {
        $set: { "thread.$.reported": true },
      },
      (err, res) => {
        if (err) {
          console.log(err);
          callback({ status: false });
        } else {
          res.matchedCount === 0
            ? callback({ status: false })
            : callback({ status: true });
        }
      }
    );
  },

  /*
   * Get message board
   *
   * @param board - name of message board
   *
   * @returns callback of thread
   */
  getBoard: function (board, callback) {
    _db
      .collection(collection)
      .find({ board: board }, { "thread.$.replies": { $slice: [0, 3] } })
      .project({
        "thread.delete_password": 0,
        "thread.replies.delete_password": 0,
      })
      .sort({
        "thread.$.bumped_on": -1,
      })
      .toArray((err, res) => {
        if (err) {
          callback(err);
        } else {
          if (res.length != 0) {
            let r = {};
            r._id = res[0]._id;
            r.board = res[0].board;

            let threads = res[0].thread;
            const threadLimit =
              threads.length > NUM_OF_THREADS ? NUM_OF_THREADS : threads.length;

            // sort thread by bumped_on 'latest' date
            threads.sort(function (date1, date2) {
              return new Date(date2.bumped_on) - new Date(date1.bumped_on);
            });

            let newThreads = threads.slice(0, threadLimit);

            // reduce replies for each thread to 3
            for (let i = 0; i < newThreads.length; i++) {
              let thread = newThreads[i];

              const replies = thread.replies;
              let slicedReplies =
                replies.length > NUM_OF_REPLIES
                  ? replies.slice(0, NUM_OF_REPLIES)
                  : replies;

              // sort replies by bumped_on 'latest' date
              slicedReplies.sort(function (date1, date2) {
                return new Date(date2.created_on) - new Date(date1.created_on);
              });

              newThreads[i].replies = slicedReplies;
            }

            r.thread = newThreads;

            callback({ status: true, result: r });
          } else {
            callback({ error: "no board found" });
          }
        }
      });
  },

  /*
   * Initial insert board
   *
   * @param board - name of message board
   *
   * @returns callback of thread
   */
  queryBoard: function (board, callback) {
    _db
      .collection(collection)
      .find({ board: board.board })
      .toArray((err, res) => {
        if (err) {
          callback(err);
        } else {
          if (res.length === 0) {
            // insert new board
            _db.collection(collection).insertOne(
              {
                _id: ObjectID(),
                board: board.board,
                thread: [
                  {
                    _id: ObjectID(),
                    text: board.text,
                    created_on: new Date(),
                    bumped_on: new Date(),
                    reported: false,
                    replies: [],
                    replycount: 0,
                    delete_password: board.delete_password,
                  },
                ],
              },
              (err, res) => {
                if (err) {
                  callback(err);
                } else {
                  const r = res.ops[0];
                  callback({ status: true, result: r });
                }
              }
            );
          } else {
            // insert new thread into existing board
            console.log("existing board ");

            _db.collection(collection).findOneAndUpdate(
              { board: board.board },
              {
                $push: {
                  thread: {
                    _id: ObjectID(),
                    text: board.text,
                    created_on: new Date(),
                    bumped_on: new Date(),
                    reported: false,
                    replies: [],
                    replycount: 0,
                    delete_password: board.delete_password,
                  },
                },
              },
              { returnOriginal: false },
              (err, res) => {
                if (err) {
                  callback(err);
                } else {
                  const r = res.value;
                  callback({ status: true, result: r });
                }
              }
            );
          }
        }
      });
  },

  /*
   * Encrypt plain text password to hash password
   *
   * @param plainTextPassword - plain text password
   * @param saltRounds - number of rounds to hash
   *
   * @return hashed password
   */
  encryptPassword: function (plainTextPassword, saltRounds) {
    return bcrypt.hashSync(plainTextPassword, saltRounds);
  },

  /*
   * Checks if both passwords entered is the same as hashed password in the database
   *
   * @param plainTextPassword - plain text password
   * @param hashPassword - hashed password
   *
   * @return true if valid password, false otherwise
   */
  isValidPassword: function (plainTextPassword, hashPassword) {
    return bcrypt.compareSync(plainTextPassword, hashPassword);
  },

  convertDateToString: function (date) {
    const d = new Date(date);

    let day = d.getDate();
    if (day < 10) {
      day = "0" + d.getDate();
    }

    return (
      //this.getDayString(d.getDay()) +
      //" " +
      this.getMonthString(d.getMonth()) +
      " " +
      day +
      ", " +
      d.getFullYear() +
      " " +
      this.get12HourTime(d.getHours(), d.getMinutes())
    );
  },

  get12HourTime: function (hours, mins) {
    let m = mins < 10 ? "0" + mins : mins;

    if (hours > 12) {
      return hours - 12 + ":" + m + "PM";
    }

    return hours + ":" + m + "AM";
  },

  /*
   * Returns the correct month abbreviation
   *
   * @param index - index of the month
   */
  getMonthString: function (index) {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    for (let i = 0; i < months.length; i++) {
      if (index === i) {
        return months[i];
      }
    }
  },

  /*
   * Returns the correct month abbreviation
   *
   * @param index - index of the day
   */
  getDayString: function (index) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 0; i < days.length; i++) {
      if (index === i) {
        return days[i];
      }
    }
  },
};
