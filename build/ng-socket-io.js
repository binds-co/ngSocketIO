(function() {
  'use strict';

  angular.module('socket-io', []).provider('socket',
    function() {
      var connectTo;
      this.connect = function(url) {
        connectTo = url;
      };
      this.$get = ["$rootScope","io","$log","$window", function($rootScope, io, $log, $window) {
        if (angular.isUndefined(connectTo)) {
          $log.warn('Socket-IO: url for connection not set. Using default: ' + $window.location.host);
          connectTo = '';
        }
        var socket = io.connect(connectTo),
          events = {},
          that = {};

        var addCallback = function(name, callback) {
          var event = events[name],
            wrappedCallback = wrapCallback(callback);

          if (!event) {
            event = events[name] = [];
          }

          event.push({
            callback: callback,
            wrapper: wrappedCallback
          });
          return wrappedCallback;
        };

        var removeCallback = function(name, callback) {
          var event = events[name],
            wrappedCallback;

          if (event) {
            for (var i = event.length - 1; i >= 0; i--) {
              if (event[i].callback === callback) {
                wrappedCallback = event[i].wrapper;
                event.slice(i, 1);
                break;
              }
            }
          }
          return wrappedCallback;
        };

        var removeAllCallbacks = function(name) {
          delete events[name];
        };

        var wrapCallback = function(callback) {
          var wrappedCallback = angular.noop;

          if (callback) {
            wrappedCallback = function() {
              var args = arguments;
              $rootScope.$apply(function() {
                callback.apply(socket, args);
              });
            };
          }
          return wrappedCallback;
        };

        var listener = function(name, callback) {
          return {
            bindTo: function(scope) {
              if (scope != null) {
                scope.$on('$destroy', function() {
                  that.removeListener(name, callback);
                });
              }
            }
          };
        };

        that = {
          on: function(name, callback) {
            socket.on(name, addCallback(name, callback));
            return listener(name, callback);
          },
          once: function(name, callback) {
            socket.once(name, addCallback(name, callback));
            return listener(name, callback);
          },
          removeListener: function(name, callback) {
            socket.removeListener(name, removeCallback(name, callback));
          },
          removeAllListeners: function(name) {
            socket.removeAllListeners(name);
            removeAllCallbacks(name);
          },
          emit: function(name, data, callback) {
            if (callback) {
              socket.emit(name, data, wrapCallback(callback));
            } else {
              socket.emit(name, data);
            }
          }
        };

        return that;
      }];
    }
  )
    .factory('io', function() {
      return io;
    });

}());