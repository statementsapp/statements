(function () {
  'use strict';

  /** @ngInject */
  function EditorController(
    $log,
    $state,
    $location,
    $interval,
    $rootScope,
    $scope,
    $sce,
    $stateParams,
    chatSocket,
    apiService,
    profileService,
    libraryService,
    profile,
    library,
    $uibModal,
    $uibModalStack,
    messageFormatter,
    BookFactory,
    focusFactory,
    Notification,
    $document,
    $timeout,
    IdFactory,
    ColorFactory,
    toastr) {

    console.log("editor controlling")

    // variable declarations
    $scope.currentLocation = $location.absUrl();
    $scope.roomUsersHtml = '<span>Nothing here yet</span>';
    $scope.roomUsers = [];
    $scope.menuExpanded = false;  
    $scope.propToAddAnimate = {};
    $scope.propToDeleteAnimate = {};
    $scope.propToRejoinAnimate = {};
    $scope.isFresh = true;
    $scope.isAlmostFresh = true;
    $scope.isMessageFresh = true;
    $scope.enter = '< enter >';
    $scope.colon = '< : >';
    $scope.aRemarkIsMousedOver = false;
    $scope.containerMouseover;
    $scope.paragraphMouseIsOver = {};
    $scope.statementHighlightIs = '';
    $scope.mouseIsOver = '';
    $scope.exportMouseover = false;
    $scope.halfClicked = false;
    $scope.halfMuteClicked = false;

    // copies to clipboard
    $scope.copyLink = function() {
      var copyElement = document.getElementById('directLinkInput');
      copyElement.select();
      document.execCommand('copy');
      toastr.info('Link copied to clipboard');
    }

    // assigns room users
    $scope.$on('socket:roomUsers', function (event, args) {
      $scope.roomUsers = Object.assign([], args);

    });

    // sends out a payload on user leave
    $scope.$on('socket:leave', function (event, args) {
      socket.emit('getUsers', $scope.bookId);

    });


    $scope.$on('socket:room', function (event, args) {
      socket.emit('getUsers', $scope.bookId);

    });



    /**
     * Changes the menu button color
     * @param i the menu button index.
     * @param hover true, if hovering; false, otherwise.
     */
    $scope.changeMenuButtonColor = function (i, hover) {
      if (!hover) {
        $scope.menuButtons[i].bgColor = '#ffffff';
      } else {
        $scope.menuButtons[i].bgColor = $scope.menuButtons[i].hoverColor;
      }
    };

    // For the toolbar button hover colors.
    $scope.hoverColors = [];
    for (var i = 0; i < 6; ++i) {
      $scope.hoverColors.push(ColorFactory.random());
    }

    // Check to load profile if we're logged in and profile isn't loaded for some reason
    $interval(function () {
        if ($rootScope.uid && $rootScope.token && $scope.profile === undefined) {
          
          apiService.readProfile().then(function (res) {
            if (res.status === 200) {
              if (res.data && res.data != 'null' ) {
                
                profileService.setProfile(res.data);
              } else {
               
                profileService.setProfile({
                    books: [],
                    emailAddress: '',
                    firstName: 'Guest',
                    lastName: 'User',
                    displayName: 'Guest User',
                    lastModified: new Date()
                });
              }
              $scope.profile = profileService.getProfile();
              
              $scope.userId = $rootScope.uid;
              chatSocket.emit('userUpdated', {
                userId: $rootScope.uid,
                displayName: $scope.profile.displayName,
                bookId: $scope.bookId
              });
            }
          });
          apiService.readLibrary().then(function (res) {
            if (res.status === 200) {
              libraryService.setLibrary(res.data);
              $scope.library = libraryService.getLibrary();
            }
          });
        } else if ($scope.bookId && $scope.profile && !$scope.roomUsers.includes($scope.profile.displayName)) {
          // console.log("that else hey")
          chatSocket.emit('userUpdated', {
            userId: $rootScope.uid,
            displayName: $scope.profile.displayName,
            bookId: $scope.bookId
          });
        }
        // console.log("That profile is: ", $scope.profile)
    }, 250);

    // Function that clears vestigial stuff saved into the model
    function isArray(o) {
      return Object.prototype.toString.call(o) === '[object Array]';
    }

    $scope.goFullScreenText = function (){
      $scope.fullScreenText = true;
      $scope.fullScreenMessages = false;
    }

    $scope.goFullScreenMessages = function (){
      $scope.fullScreenText = false;
      $scope.fullScreenMessages = true;
    }

    $scope.goSplitScreen = function (){
      $scope.fullScreenText = false;
      $scope.fullScreenMessages = false;
    }

    $scope.assignFirstsToNodes = function(){

      var apply = {};

      traverse($scope.data[0]);

      function traverseArray(arr) {
        arr.forEach(function (x) {
          traverse(x);
        });
      }

      function traverseObject(obj) {
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            traverse(obj[key], key, obj);
          }
        }
      }

      function traverse(x, key, obj) {
        if (isArray(x)) {
          traverseArray(x);
        } else if ((typeof x === 'object') && (x !== null)) {
          traverseObject(x);
        } else {
          if (key === 'nodeId' && obj.minimized !== undefined) {

            for (var i = 0; i < obj.paragraphs.length; i++){
              if (obj.paragraphs[i][$scope.userId] !== 'hidden' &&
                !obj.paragraphs[i].hiddenForAll){
                obj.paragraphs[i].first = true;
                apply.paragraphSkip = i;
                break;
              }
            }
            for (var i = 0; i < obj.paragraphs.length; i++){
              if (i !== apply.paragraphSkip){
                obj.paragraphs[i].first = false;
              }
            }

            // apply.nodeSkip = null;
            apply.paragraphSkip = null;

            for (var h = 0; h < obj.paragraphs.length; h++){
              for (var i = 0; i < obj.paragraphs[h].propositions.length; i++){
                if (obj.paragraphs[h].propositions[i][$scope.userId] !== 'hidden' &&
                  !obj.paragraphs[h].propositions[i].hiddenForAll &&
                  !apply.skip){

                  obj.paragraphs[h].propositions[i].first = true;
                  apply.skip = true;


                } else if (apply.skip){
                  obj.paragraphs[h].propositions[i].first = false;
                }
              }
              apply.skip = false;
            }



          }
        }
      }
    }



    // Signs out
    $scope.logout = function () {
      apiService.signOut().then(function () {
        profileService.clear();
        libraryService.clear();
        $rootScope.guest = false;
        $state.go('login');
      });
    };

    $scope.hideAwayNegations = function () {

    }

    function setCursor(pos, id) {
        var tag = document.getElementById(id);

        // Creates range object
        var setpos = document.createRange();

        // Creates object for selection
        var set = window.getSelection();
        // Set start position of range
        setpos.setStart(tag.childNodes[0], pos);

        // Collapse range within its boundary points
        // Returns boolean
        setpos.collapse(true);

        // Remove all ranges set
        set.removeAllRanges();

        // Add range with respect to range object.
        set.addRange(setpos);

        // Set cursor on focus
        tag.focus();
    }

    $scope.makePristine = function () {

      function traverse(x, key, obj) {
        if (isArray(x)) {
          traverseArray(x);
        } else if ((typeof x === 'object') && (x !== null)) {
          traverseObject(x);
        } else {
          //
        }
      }

      function traverseArray(arr) {
        arr.forEach(function (x) {
          traverse(x);
        });
      }

      function traverseObject(obj) {
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            traverse(obj[key], key, obj);
          }
        }
      }

      if (!$scope.once) {
        $scope.once = true;
        traverse($scope.data[0]);
      }

      if ($('span').hasClass('visible-cursor')) {
        $('span').removeClass('visible-cursor');
        $('span').addClass('invisible-cursor');
      }
      if ($("div").hasClass('blackline')) {
        $("div").removeClass('blackline');
      }
    };

    $scope.inverted = false;
    // Inverts page colors
    $scope.invert = function () {

      // Silly function
      // Update menu button icon
      var css = 'html {-webkit-filter: invert(100%);' +
        '-moz-filter: invert(100%);' +
        '-o-filter: invert(100%);' +
        '-ms-filter: invert(100%); }',
        head = document.getElementsByTagName('head')[0],
        style = document.createElement('style');
      if (!window.counter) {
        window.counter = 1;
      } else {
        window.counter++;
      }
      if (window.counter % 2 === 0) {
        var css =
          'html {-webkit-filter: invert(0%); -moz-filter: invert(0%); -o-filter: invert(0%); -ms-filter: invert(0%); }';
      }
      style.type = 'text/css';
      if (style.styleSheet) {
        style.styleSheet.cssText = css;
      } else {
        style.appendChild(document.createTextNode(css));
      }
      head.appendChild(style);
      $scope.inverted = !$scope.inverted;


      // document.getElementById('fulleditor').style.backgroundColor = '#15202B';

      document.getElementById('directLinkInput').style.color = 'black';
      document.getElementById('exporttext').style.color = 'white';
      document.getElementById('thatdownloadbutton').style.borderColor = 'white';
      document.getElementById('thatdownloadbutton').style.color = 'white';
      document.getElementById('thatdownloadbutton').style.border = '1px';

      var icon = $scope.inverted ? 'fas fa-sun' : 'fas fa-moon';
      for (var i = 0; i < $scope.menuButtons.length; i++) {
        if ($scope.menuButtons[i].key === 'invert') {
          $scope.menuButtons[i].icon = icon;
        }
      }
    };


    $scope.copyBookIdToClipboard = function () {
      var ghost = document.createElement('textarea');
      document.body.appendChild(ghost);
      ghost.value = $scope.bookId;
      ghost.select();
      document.execCommand('copy');
      document.body.removeChild(ghost);
    };


    // Modal button function for new books
    $scope.openNewBookModal = function () {
      $scope.addBookModalInstance = $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title-new-book',
        ariaDescribedBy: 'modal-body-new-book',
        templateUrl: 'app/editor/new-book-modal/new-book-modal.html',
        size: 'lg',
        controller: 'NewBookModalController',
        controllerAs: 'vm',
        keyboard: false,
        backdrop: 'static',
        // windowTemplateUrl: 'app/editor/new-book-modal/choice-window.html',
        resolve: {
          profileService: profileService,
          libraryService: libraryService,
          apiService: apiService
        }
      }).result.then(function (bookId) {
        if (bookId) {
          chatSocket.emit('leave', bookId);
          $state.go('main.editor', {bookId: bookId});
        }
      });
    };

    $scope.openLibraryModal = function () {
      $scope.addBookModalInstance = $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title-library',
        ariaDescribedBy: 'modal-body-library',
        templateUrl: 'app/editor/library-modal/library-modal.html',
        size: 'lg',
        controller: 'LibraryModalController',
        controllerAs: 'vm',
        keyboard: false,
        backdrop: 'static',
        resolve: {
          profileService: profileService,
          libraryService: libraryService,
          apiService: apiService
        }
      }).result.then(function (bookId) {
        if (bookId) {
          chatSocket.emit('leave', $scope.bookId);
          $state.go('main.editor', {bookId: bookId});
        }
      });
    };

    $scope.openExportModal = function () {
      $scope.addBookModalInstance = $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title-export',
        ariaDescribedBy: 'modal-body-export',
        templateUrl: 'app/editor/export-modal/export-modal.html',
        size: 'lg',
        controller: 'ExportModalController',
        controllerAs: 'vm',
        keyboard: false,
        backdrop: 'static',
        resolve: {
          profileService: profileService,
          libraryService: libraryService,
          apiService: apiService
        }
      }).result.then(function (bookId) {
        if (bookId) {
          // chatSocket.emit('leave', $scope.bookId);
          $state.go('main.editor', {bookId: bookId});
        }
      });
    };

    $scope.openBillingPortal = function() {
      apiService.openBillingPortal($location.absUrl()).then(
        function(resp) {
          window.location.href = resp.data.redirectUrl;
        }, 
        function (error) {
          console.error('error opening billing portal')
        })
    }

    $scope.openLoginModal = function () {
      $scope.loginModalInstance = $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title-login',
        ariaDescribedBy: 'modal-body-login',
        templateUrl: 'app/landing/login-modal/login-modal.html',
        size: 'lg',
        controller: 'LoginModalController',
        controllerAs: 'vm',
        backdrop: 'static',
        keyboard: false,
      }).result.then(function (success) {
        if (success) {
          $location.reload();
        }
      });
    };

    $scope.openRegisterModal = function () {
      $scope.loginModalInstance = $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title-register',
        ariaDescribedBy: 'modal-body-register',
        templateUrl: 'app/landing/register-modal/register-modal.html',
        size: 'lg',
        controller: 'RegisterModalController',
        controllerAs: 'vm',
        backdrop: 'static',
      }).result.then(function (success) {
        if (success) {
          $location.reload();
        }
      });
    };

    $scope.openSignupModal = function () {
      $scope.loginModalInstance = $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title-register',
        ariaDescribedBy: 'modal-body-register',
        templateUrl: 'app/landing/signup-modal/signup-modal.html',
        size: 'lg',
        controller: 'SignupModalController',
        controllerAs: 'vm',
        backdrop: 'static',
      }).result.then(function (success) {
        if (success) {
          $location.reload();
        }
      });
    };

    $scope.openProfileModal = function () {
      $scope.addBookModalInstance = $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title-profile',
        ariaDescribedBy: 'modal-body-profile',
        templateUrl: 'app/editor/profile-modal/profile-modal.html',
        size: 'lg',
        controller: 'ProfileModalController',
        controllerAs: 'vm',
        backdrop: 'static',
        keyboard: false,
        resolve: {
          profileService: profileService,
          libraryService: libraryService,
          apiService: apiService
        }
      }).result.then(function () {
        $scope.profile = profileService.getProfile();

        chatSocket.emit('userUpdated', {
          userId: $scope.uid,
          displayName: $scope.profile.displayName,
          bookId: $scope.bookId
        });
      });
    };

    $scope.openAddExistingBookModal = function () {
      $uibModal.open({
        animation: true,
        ariaLabelledBy: 'modal-title-add-existing-book',
        ariaDescribedBy: 'modal-body-add-existing-book',
        templateUrl: 'app/editor/add-existing-book-modal/add-existing-book-modal.html',
        size: 'lg',
        controller: 'AddExistingBookModalController',
        controllerAs: 'vm',
        backdrop: 'static',
        keyboard: false,
        resolve: {
          apiService: apiService,
          profileService: profileService
        }
      }).result.then(function (bookId) {
        if (bookId) {
          $state.go('main.editor', {bookId: bookId});
        }
      });
    };

    $scope.openOptionsModal = function () {
      $uibModal.open({
        ariaLabelledBy: 'modal-title-editor-options',
        ariaDescribedBy: 'modal-body-editor-options',
        templateUrl: 'app/editor/editor-options-modal/editor-options-modal.html',
        controller: 'EditorOptionsModalController',
        controllerAs: 'vm',
        size: 'md',
        backdrop: 'static',
        keyboard: false,
        resolve: {
          options: function () {
            return $scope.options;
          }
        }
      }).result.then(function (res) {
        $scope.options = res;
      });

    };

    // Loading data
    $scope.loadData = function (bookId) {
      $timeout(function() {
        apiService.readBook(bookId).then(function (result) {
          $scope.data = [ result.data ];
          $scope.title = $scope.data[0].nodes[0].topic;
          apiService.readPropositions(bookId).then(function (result) {
            if (result) {
              $scope.propositions = result.data;
              $scope.bookId = bookId;
              $scope.mainLoop();
            }
          }).catch(function (error) {
            // console.error(1Gerror);
          });
        }).catch(function (error) {
          // console.error(error);
        });
      }, 10);
    };

    $uibModalStack.dismissAll();

    // If a book id is present, load it
    if ($stateParams.bookId) {
      $scope.bookId = $stateParams.bookId;
      $scope.loadData($scope.bookId);
    }

    // Frontend option variables
    $scope.options = {
      highlightOwned: false,
      dimNotOwned: false
    };

    // $scope.title = '';
    $scope.profile = profileService.getProfile();
    $scope.userId = $rootScope.uid;

    $scope.loggedIn = function () {
      return $rootScope.uid !== undefined;
    };

    $scope.isGuest = function() {
      return $rootScope.guest;
    };

    $scope.canSeeTitle = function() {
      return $scope.isGuest() || $scope.loggedIn();
    };

    // Main function
    $scope.mainLoop = function () {

      $scope.treeOptions = {};
      $scope.mousedOverProposition = {};
      $scope.topics = [{}];
      $scope.scroll = {};
      $scope.keyword = {};
      $scope.messageLog = '';
      $scope.inputs = {};
      $scope.selectedThread = {};
      $scope.preselectedProposition = {};
      $scope.selectedRemark = {};
      $scope.of = {};
      $scope.highlight = {};
      $scope.mark = {};
      $scope.doubleClick = 0;
      $scope.whatHasBeenClicked = '';
      $scope.dontrunfocusout = false;
      $scope.fullScreenText = true;
      $scope.fullScreenMessages = false;
      $scope.hasTopFocus = '';
      $scope.hasBottomFocus = {};
      $scope.hasLeftFocus = {};
      $scope.hasRightFocus = {};
      $scope.hasChatFocusThreadId = '';
      $scope.hasChatFocusId = '';
      $scope.toBeClearedLater = {};
      $scope.toSetLater = {};
      $scope.threadAddMouseover = '';
      $scope.threadAdding = '';
      $scope.newProp;
      $scope.stopToggle = false;
      $scope.once = false;
      $scope.lastItemCursorLayer = 0;
      $scope.demoCounter = 0;
      $scope.cancelListenForDoubleClick;
      $scope.draggedNode = {};
      $scope.draggedParagraph= {};
      $scope.draggedProposition = {};
      $scope.propositionToSetLater = {};
      $scope.paragraphToSetLater = {};
      $scope.testCounter = 0;
      $scope.textMouseOver;
      $scope.dialogueMouseOver;
      $scope.recycleRemarks = false;
      $scope.xMouseOver;
      $scope.upperDragScrollerMouseOver = false;
      $scope.lowerDragScroller = false;
      $scope.tempStopEditable = false;
      $scope.minimalStyle = false;
      $scope.diagnostics = false;
      $scope.onTheBoard = false;
      $scope.oneMoveIn = false;
      $scope.thisMoveCounter = 0;
      $scope.inputString = 'inputs.' + $scope.userId;
      $scope.timer;
      $scope.isMouseOut = false;
      $scope.topAdderId = IdFactory.next();
      $scope.textareaHasFocus = {};

      $scope.currentRemarkIndex = 0;


      $scope.shortEditor = false;
      

      document.addEventListener('contextmenu', event => event.preventDefault());

      if (!$scope.data[0].muteds){
        $scope.data[0].muteds = [];
      }

      var hidden = '';
      var visibilityChange = '';
      $scope.theseInputs = [];
      
      if (!$scope.data[0].authorTable){
        $scope.data[0].authorTable = [];
        $scope.data[0].isFresh = true;
      }

      if ($scope.data[0].dialogue){
        for (var i = 0; i < $scope.data[0].dialogue.length; i++){
          if ($scope.data[0].dialogue[i].author === $scope.userId){
            $scope.onTheBoard = true;
            $scope.thisMoveCounter++;
          }
        }
      }



      var theDragElement = document.getElementById('dragelement')
      var onMouseMove = function(e){

        setTimeout(function () {
          $scope.$apply(function () {

              if ($scope.draggingProposition || $scope.draggingParagraph || $scope.draggingNode){
                document.getElementById('dragelement').style.left = ((parseInt(e.pageX) * 1.33) + 10).toString() + 'px';
                document.getElementById('dragelement').style.top = (parseInt(e.pageY) * 1.33).toString() + 'px';
              }

          });
        }, 5);

      };
      document.addEventListener('mousemove', onMouseMove);

      var prep = {};
      var apply = {};
      var temp = {};

      // if (!$scope.profile){
      //   console.log("Getting profile")
      //   $scope.profile = profileService.getProfile();
      // }

      // Deals with empty remarks values

      for (var i = 0; i < $scope.data[0].nodes.length; i++){
        for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
          for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
            if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks === undefined){
              // console.log(angular.copy(i), ", ", angular.copy(j), ", ", angular.copy(k), ": ", angular.copy($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks))
              $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks = [];
              // console.log("Now: ", angular.copy(i), ", ", angular.copy(j), ", ", angular.copy(k), ": ", angular.copy($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks))
            }
          }
        }
      }

      //   Pastel colors for paragraphs
      $scope.pastels = ['#f9ceee', '#e0cdff', '#c1f0fb', '#dcf9a8', '#ffebaf'];
      $scope.lighterOtherPastels = ['#ffbec4', '#edf5dd', '#d0f1e5', '#dbe0f1', '#ffa64c'];

      // these are the current pastels
      $scope.otherPastels = ['#00FFFF', '#00BFFF', '#9acd33', '#ff9225', '#9ea3f5', '#D1FFBD'];
      // Other suitable pastels below
      // ,'#c7ceea','#ffb7b2'
      // Light theme pastels below
      // '#c0ecdd','#c7ceea','#ffb7b2','#ffd9c0'


      $scope.authorTableLength = angular.copy($scope.data[0].authorTable.length); 
      $scope.pastelsLength = angular.copy($scope.otherPastels.length); 
      var isColorThere;
      for (var i = 0; i < $scope.data[0].authorTable.length; i++){
        if ($scope.data[0].authorTable[i].authorId === $scope.userId && $scope.data[0].documentClaimedBy !== $scope.userId){
        
          isColorThere = true;
          $scope.remarkInputColor = $scope.data[0].authorTable[i].color;
          $scope.remarkInputString = '3px solid ' + $scope.data[0].authorTable[i].color;
          

        }
      }
      if (!isColorThere && $scope.data[0].documentClaimedBy !== $scope.userId && $scope.data[0].documentClaimedBy){
       
        $scope.remarkInputColor = $scope.otherPastels[($scope.authorTableLength-1)];
        $scope.remarkInputString = '3px solid ' + $scope.remarkInputColor;
      }
      var isColorThere = false;

      // when a new author comes in, have to advance the color

     


      // used to have #edeff8 #DDE1D6 #a7e99c
      if (typeof document.hidden !== 'undefined') { // Opera 12.10 and Firefox 18 and later support
        hidden = 'hidden';
        visibilityChange = 'visibilitychange';
      } else if (typeof document.msHidden !== 'undefined') {
        hidden = 'msHidden';
        visibilityChange = 'msvisibilitychange';
      } else if (typeof document.webkitHidden !== 'undefined') {
        hidden = 'webkitHidden';
        visibilityChange = 'webkitvisibilitychange';
      }

      var dialogueList = document.getElementById('dialoguelist');

      function handleVisibilityChange() {
        if (document[hidden]) {
          $scope.hasRightFocus = {};
          // $scope.clearBlankOnBlur(null, true);
        } else {
          return;
        }
      }

      // Warn if the browser doesn't support addEventListener or the Page Visibility API
      if (typeof document.addEventListener === 'undefined' || hidden === undefined) {
        $scope.inputs.nothing;
      } else {
        // Handle page visibility change
        document.addEventListener(visibilityChange, handleVisibilityChange, false);
      }


      // full screen text if no messages
      if ($scope.data[0].dialogue){

        $scope.fullScreenMessages = false;
        $scope.fullScreenText = false;
      }


      $scope.assignFirstsToNodes();



      // Shuffles paragraph color order
      function shuffle(array) {
        var currentIndex = array.length, temporaryValue, randomIndex;
        while (0 !== currentIndex) {
          randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex -= 1;
          temporaryValue = array[currentIndex];
          array[currentIndex] = array[randomIndex];
          array[randomIndex] = temporaryValue;
        }
        return array;
      }

      // shuffle($scope.otherPastels);

      $(document).ready(function() {
        $('[ui-view]').attr('id', 'wholedamneditor');
      });

      document.getElementById('wholedamneditor').style.backgroundColor = '#0C2340';

      $scope.userColorTable = [];
      //initializes as number of colors in the palette
      $scope.userColorCount = $scope.otherPastels.length;

      if (!$scope.userColor){
        $scope.userColor = $scope.otherPastels[$scope.data[0].authorTable.length-1];
      }
      // For picking a color from the palette
      $scope.generateNewColor = function () {
        var index = $scope.userColorCount % $scope.otherPastels.length;
        $scope.userColorCount++;
        return $scope.otherPastels[index];
      };

      $scope.toggleNode = function (node) {
        node.minimized = !node.minimized;
      };

      $scope.goRecycleRemarks = function () {
        $scope.recycleRemarks = true;
      }

      $scope.dontRecycleRemarks = function () {
        $scope.recycleRemarks = false;
      }

      // $scope.goRecycleRemarks();
      // $scope.hideOthersParagraphs();


      $scope.makeTextFile = function() {

        // Build the book into a text string

        $scope.bookBeingCompiled = '';


        var levelZero = '';
        var levelOne = '';
        var levelTwo = '';
        var levelThree = '';

        for (var i = 0; i < $scope.data[0].nodes.length; i++){

          if ($scope.data[0].nodes[i].sectionLevel == 0){
            $scope.bookBeingCompiled = $scope.bookBeingCompiled + levelZero + $scope.data[0].nodes[i].topic + '\r\n\r\n';
          } else if ($scope.data[0].nodes[i].sectionLevel == 1){
            $scope.bookBeingCompiled = $scope.bookBeingCompiled + levelOne + $scope.data[0].nodes[i].topic + '\r\n\r\n';
          } else if ($scope.data[0].nodes[i].sectionLevel == 2){

            $scope.bookBeingCompiled = $scope.bookBeingCompiled + levelTwo + $scope.data[0].nodes[i].topic + '\r\n\r\n';
          } else if ($scope.data[0].nodes[i].sectionLevel == 3){
            $scope.bookBeingCompiled = $scope.bookBeingCompiled + levelThree + $scope.data[0].nodes[i].topic + '\r\n\r\n';
          }

          for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
            if (!$scope.data[0].nodes[i].paragraphs[j].hiddenForAll &&
                $scope.data[0].nodes[i].paragraphs[j][$scope.userId] !== 'hidden'){
              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                if (!$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll &&
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k][$scope.userId] !== 'hidden'){
                  $scope.bookBeingCompiled = $scope.bookBeingCompiled + $scope.data[0].nodes[i].paragraphs[j].propositions[k].text + ' ';
                }
              }
            }
            $scope.bookBeingCompiled = $scope.bookBeingCompiled + '\r\n\r\n';
          }
        }



        // Make a blob of teh book being compiled
        var data = new Blob([$scope.bookBeingCompiled], { type: 'text/plain' });

        // If there's already a text file variable assigned, revoke its url
        if ($scope.textFile !== null) {
          window.URL.revokeObjectURL($scope.textFile);
        }

        // Make a URL of the data and save it as textFile
        $scope.textFile = window.URL.createObjectURL(data);


        // Return textFile
        return $scope.textFile;
      };


      var create = document.getElementById('downloadlink');
      $scope.textFile = $scope.data[0];
      //works

      if (create) {
        create.addEventListener('click', function() {
          var link = document.getElementById('downloadlink');
          link.href = $scope.makeTextFile();
        }, false);
      }

      $scope.clickDownloadLink = function () {
        document.getElementById('downloadlink').click();
      }

      $scope.assignColorsToExistingRemarks = function () {

        // needed but needs to be rewritten

        function traverse(x, key, obj) {
          if (isArray(x)) {
            traverseArray(x);
          } else if ((typeof x === 'object') && (x !== null)) {
            traverseObject(x);
          } else {
            if (key === 'isMessage') {
              for (var i = 0; i < $scope.userColorTable.length; i++) {
                if (x === $scope.userColorTable[i].author && x !== $scope.userId) {
                  var alreadyThere = true;
                  var index = i;
                  break;
                }
              }

              if (x !== $scope.userId && x !== '' && obj.type !== 'topic' && alreadyThere) {
                
                if (obj.author == $scope.userId){
                  obj.color = $scope.userColorTable[index].color;
                } else {
                  obj.color = 'white';
                }

              }

              if (!alreadyThere && obj.type !== 'topic' && x !== '' && x !== $scope.userId){
                // console.log("NOT already there for object: ", obj, " and x of ", x)
                $scope.userColorTable.push(
                  {
                    author: x,
                    color: $scope.generateNewColor()
                  }
                )
                if (obj.author == $scope.userId){
                  obj.color = $scope.userColorTable[$scope.userColorTable.length-1].color;
                } else {
                  obj.color = 'white';
                }

              }
            }
          }
        }

        function traverseArray(arr) {
          arr.forEach(function (x) {
            traverse(x);
          });
        }

        function traverseObject(obj) {
          for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
              traverse(obj[key], key, obj);
            }
          }
        }

        // Executes
        traverse($scope.data[0].dialogue);
      };

      // Runs functions that clean up vestigial stuff saved into the data
      $scope.makePristine();
      //
      //



      // Scrolls to the bottom of messages
      $timeout(function () {
        var pane = document.getElementById('dialoguelist');
        pane.scrollTop = pane.scrollHeight;
      }, 30);




      // If an empty book, focus on the blank proposition
      var blankClickAssigned = {};
      for (var i = $scope.data[0].nodes[0].paragraphs.length-1; i > -1; i--) {
        for (var j = $scope.data[0].nodes[0].paragraphs[i].propositions.length-1; j > -1; j--) {
          if ($scope.data[0].nodes[0].paragraphs[i][$scope.userId] !== 'hidden' &&
            !$scope.data[0].nodes[0].paragraphs[i].hiddenForAll &&
            $scope.data[0].nodes[0].paragraphs[i].propositions[j][$scope.userId] !== 'hidden' &&
            $scope.data[0].nodes[0].paragraphs[i].propositions[j].hiddenForAll !== true &&
            $scope.data[0].nodes[0].paragraphs[i].propositions[j].type !== 'blank') {
           
            blankClickAssigned.assigned = true;
            break;
          } else if ($scope.data[0].nodes[0].paragraphs[i][$scope.userId] !== 'hidden' &&
            !$scope.data[0].nodes[0].paragraphs[i].hiddenForAll &&
            $scope.data[0].nodes[0].paragraphs[i].propositions[j].type === 'blank' &&
            $scope.data[0].nodes[0].paragraphs[i].propositions[j].hiddenForAll !== true &&
            $scope.data[0].nodes[0].paragraphs[i].propositions[j][$scope.userId] !== 'hidden') {
            
            blankClickAssigned.id = $scope.data[0].nodes[0].paragraphs[i].propositions[j].id;
            blankClickAssigned.paragraphPosition = i;
            blankClickAssigned.position = j;
          }
        }
      }
      if (!blankClickAssigned.assigned && $scope.userId === $scope.data[0].documentClaimedBy) {

        $scope.selectedNode = $scope.data[0].nodes[0];
        $scope.selectedParagraph = $scope.data[0].nodes[0].paragraphs[blankClickAssigned.paragraphPosition];
        $scope.selectedProposition =
        $scope.data[0].nodes[0].paragraphs[blankClickAssigned.paragraphPosition].propositions[blankClickAssigned.position];
        $timeout(function () {
         
          document.getElementById('proposition' + blankClickAssigned.id).click();
          blankClickAssigned = {};
        }, 10);
      }



      // If the data doesn't have a dialogue, make the dialogue empty
      if (!$scope.data[0].hasOwnProperty('dialogue')) {
        $scope.data[0].dialogue = [];
      }

      // When propositions are being typed as new messages directly on a topic
      $scope.showThreadAdd = function (thread) {

        setTimeout(function () {
          $scope.$apply(function () {
            $scope.hasChatFocusId = '';
            $scope.hasChatFocusThreadId = '';
            $scope.threadAdding = thread.threadId;
            $('#addto' + thread.threadId).expanding();
            focusFactory('addto' + thread.threadId);
          });
        }, 20);

        setTimeout(function () {
          $scope.$apply(function () {
            $scope.hasChatFocusId = '';
            $scope.hasChatFocusThreadId = '';
            $scope.threadAdding = thread.threadId;
            $('#addto' + thread.threadId).expanding();
            $('#addto' + thread.threadId).expanding(); //duplicate
            focusFactory('addto' + thread.threadId);
          });
        }, 20);
        $scope.stopToggle = true;
      };

      $scope.handleClick = function (event, theId, flag) {
        if ($scope.userId !== $scope.data[0].documentClaimedBy){
          return;
        }
        switch(event.which) {
                case 1:
                    break;
                case 2:
                    // in case you need some middle click things
                    break;
                case 3:
                    console.log("Right click")
                    event.preventDefault();
                    if (flag){
                      console.log("flag")
                      $scope.muteClicked = {
                        id: theId
                      };
                    } else {
                      $scope.tweetClicked = {
                        id: theId
                      };
                    }
                    
                    if ($scope.selectedProposition.id){
                      document.getElementById($scope.selectedProposition.id).blur();
                    }
                      
                    // top-30
                    // left-180
                    // var offsetHeight = document.getElementById('proposition' + theId).getBoundingClientRect().top*.75;
                    // var offsetWidth = document.getElementById('proposition'+ theId).getBoundingClientRect().left*.75;

                    
                    

                     // this is right click
                    
                    $scope.cancelListenForDoubleClick = true;
                    setTimeout(function () {
                      $scope.$apply(function () {

                        $scope.cancelListenForDoubleClick = false;
                      });
                    }, 260);

                        // var tweetButton = document.getElementById('tweet-button');
                        

                        // var thisClientX = (parseInt(event.pageX) * 1).toString() + 'px';
                        // var thisClientY = (parseInt(event.pageY) * 1).toString() + 'px';

                        // tweetButton.style.top = thisClientY;
                        // tweetButton.style.left = thisClientX;
                        // tweetButton.classList.add('grow');
                    
              
            }
      }

      $scope.openTwitterPost = function (text) {

        // Open the Twitter website in a new window and pre- the tweet with the specified text
          window.open('https://twitter.com/intent/tweet?text=' + 
            encodeURIComponent(text + '\n\n' + $scope.currentLocation));
          $scope.tweetClicked = {};
      }

      $scope.muteUser = function (id) {
        $scope.data[0].muteds.push(id);
        $scope.muteClicked = {};
      }

      // Hides
      $scope.hideThreadAdd = function () {
        $scope.threadAdding = '';
        $scope.stopToggle = true;
      };

      // For when clicks do multiple things
      $scope.exitNgClick = function () {
        $scope.stopToggle = false;
      };

      $scope.runThisFunction = function (id) {
        timeout(function() {
            // Call your initialization function here
            console.log("That Id you ordered: ", id)
          }, 3000); // Delay for 3 seconds
        

      }

      // Fires sometimes
      $scope.selectBlank = function (node) {
        var id = $scope.data[0].nodes[0].paragraphs[0].propositions[0].id;
        $scope.selectedNode = node;
        $scope.selectedParagraph = $scope.data[0].nodes[0].paragraphs[0];
        $scope.selectedProposition = $scope.data[0].nodes[0].paragraphs[0].propositions[0];
        $timeout(function () {
          document.getElementById('proposition' + id).click();
        }, 0);
      };

      $scope.openNav = function () {
        document.getElementById('myNav').style.height = '100%';
      };

      $scope.closeNav = function () {
        document.getElementById('myNav').style.height = '0%';
      };

      // For blurring the text
      $scope.blurText = function () {
        if (document.getElementById('thetext').classList
          .contains('textblurrer')) {
          document.getElementById('thetext').classList
            .remove('textblurrer');
        } else {
          document.getElementById('thetext').classList
            .add('textblurrer');
        }
      };

      // Blurs dialogue
      $scope.blurDialogue = function () {
        if (document.getElementById('dialoguepane').classList
          .contains('dialogueblurrer')) {
          document.getElementById('dialoguepane').classList
            .remove('dialogueblurrer');
        } else {
          document.getElementById('dialoguepane').classList
            .add('dialogueblurrer');
        }
      };

      // For greying the text
      $scope.greyText = function () {
        if (document.getElementById('thetext').classList
          .contains('textgrey')) {
          document.getElementById('thetext').classList
            .remove('textgrey');
            $scope.textGrey = false;
        } else {
          document.getElementById('thetext').classList
            .add('textgrey');
            $scope.textGrey = true;

        }
      };

      // Greys dialogue
      $scope.greyDialogue = function () {
        if (document.getElementById('dialoguepane').classList
          .contains('dialoguegrey')) {
          document.getElementById('dialoguepane').classList
            .remove('dialoguegrey');
            $scope.dialogueGrey = false;
        } else {
          document.getElementById('dialoguepane').classList
            .add('dialoguegrey');
            $scope.dialogueGrey = true;
        }
      };

      $scope.queryBlur = function () {

        if (document.getElementById('dialoguepane').classList.contains('dialogueblurrer')){
          return true;
        } else {
          return false;
        }
      }

      $scope.statementHighlight = function(id){

        setTimeout(function () {
          $scope.$apply(function () {
            $scope.statementHighlightIs = id;
          });
        }, 0);
      }

      $scope.statementUnHighlight = function(id){

        setTimeout(function () {
          $scope.$apply(function () {
            $scope.statementHighlightIs = '';
          });
        }, 5);
      }

      $scope.assessDragScrollUpper = function () {
        // if ($scope.draggedProposition.id && $scope.upperDragScrollerMouseOver){




          // document.getElementById('tree-root').scrollTop--;




          // console.log("triggers scroll upper")
        // }
      }

      $scope.assessDragScrollLower = function () {
        // if ($scope.draggedProposition.id && $scope.upperDragScrollerMouseOver){
          document.getElementById('tree-root').scrollTop += 1;
          console.log("triggers scroll lower")

        // }
      }

      $scope.toggleMinimalStyling = function () {
        $scope.minimalStyle = !$scope.minimalStyle;
      }

      // For text blurrer
      $scope.mouseOverTextBlurrer = function () {
        if (!$scope.data[0].isFresh){
          document.getElementById('textblurrer').classList
            .add('dialogueblurrermouseover');
          $scope.lowerDragScroller = !$scope.lowerDragScroller;
        }
      };

      // Leave text blurrer
      $scope.mouseLeaveTextBlurrer = function () {
        document.getElementById('textblurrer').classList
          .remove('dialogueblurrermouseover');
      };



      // For dialogue blurrer
      $scope.mouseOverDialogueBlurrer = function () {
        document.getElementById('dialogueblurrer').classList
          .add('dialogueblurrermouseover');
      };

      // Leave dialogue blurrer
      $scope.mouseLeaveDialogueBlurrer = function () {
        document.getElementById('dialogueblurrer').classList
          .remove('dialogueblurrermouseover');
      };

      // Assigns mouseover to a proposition and keeps track of which proposition has the mouse over
      $scope.mouseOver = function (proposition) {
        $scope.mousedOverProposition = proposition;
        $scope.mousedOverProposition.mouseOver = true;
      };

      // Clears upon mouseleave
      $scope.mouseLeave = function () {
        $scope.mousedOverProposition = {};
      };

      // Clears the selected proposition and paragraph
      $scope.clearSelectedProposition = function () {
        $scope.selectedProposition = null;
        $scope.selectedParagraph = null;
      };

      // Selects right editable span
      $scope.selectRight = function (proposition, paragraph) {
        // $scope.inputs[proposition.id] = '';
        focusFactory(proposition.id);
        $scope.whatHasBeenClicked = proposition.id;
        $scope.unHighlightParagraph();


      };

      $scope.assignRightFocus = function (id, event) {
        if (event){
          if (event.type !== 'click'){
            return;
          }
        }
        
        $timeout(function () {
          $scope.$apply(function () {
            $scope.inputs[id] = ''
            document.getElementById(id).innerHTML = '';
          });
        }, 0);
      };

      // Selects left editable span
      $scope.selectLeft = function (proposition, paragraph) {
        $scope.selectedProposition = proposition;
        $scope.unHighlightParagraph();
      };

      // Selects node
      $scope.selectNode = function (node) {
        $scope.selectedNode = node;

      };

      // Selects paragraph
      $scope.selectParagraph = function (paragraph) {
        // $timeout(function () {
        //   $scope.$apply(function () {
            $scope.selectedParagraph = paragraph;
            paragraph.cursor = false;
        //   });
        // }, 0);

      };

      $scope.scrollAndClick = function (id){
        // var elmnt = document.getElementById(id);


      }

      $scope.getColors = function (payload) {
              if ($scope.data[0].authorTable.length == 0){

                $scope.data[0].authorTable = [
                  {
                        authorId: angular.copy(payload.author),
                        color: 'white'
                  }
                ]
                if (payload.author === $scope.userId){
                  $scope.userColor = 'white';
                }
                var payloadColor = 'white';
              } else {
                // loop through author table



                for (var i = 0; i < $scope.data[0].authorTable.length; i++){
                  if ($scope.data[0].authorTable[i].authorId === payload.author){
                    var payloadColor = $scope.data[0].authorTable[i].color;
                    var colorAssigned = true;
                    break;
                  }
                  // it pulled the color from the table and assigned it
                }
                if (!colorAssigned){


                  var payloadColor = $scope.otherPastels[$scope.data[0].authorTable.length -1];

                

                  $scope.data[0].authorTable.push({
                    authorId: payload.author,
                    color: angular.copy(payloadColor)
                  })
                  if (payload.author === $scope.userId){
                    $scope.userColor = payloadColor;
                  }
                }
              }
              return payloadColor;
      }

      $scope.calcColors = function (payload) {

        // calculates colors for a new payload
              if ($scope.data[0].authorTable.length == 0){

                $scope.data[0].authorTable = [
                  {
                        authorId: angular.copy(payload.author),
                        color: 'white'
                  }
                ]
                if (payload.author === $scope.userId){
                  $scope.userColor = 'white';
                }
                var payloadColor = 'white';

                // if the author table is presently blank, assign yourself light grey 
                // as you are now author


              } else {
                // loop through author table



                for (var i = 0; i < $scope.data[0].authorTable.length; i++){
                  if ($scope.data[0].authorTable[i].authorId === payload.author){
                    var payloadColor = $scope.data[0].authorTable[i].color;
                    var colorAssigned = true;
                    break;
                  }


                  // look up the color already assigned to the payload author
                  // if there, the payload will have that color


                }
                if (!colorAssigned){

                  // if it's not in the table,
                  // make the color the first unused one in the pastels array

                  var payloadColor = $scope.otherPastels[$scope.data[0].authorTable.length -1];
                  if (payload.author !== $scope.userId){
                    $scope.remarkInputColor = $scope.otherPastels[($scope.authorTableLength - 1)];
                    $scope.remarkInputString = '3px solid ' + $scope.remarkInputColor;
                  }


                  $scope.data[0].authorTable.push({
                    authorId: payload.author,
                    color: angular.copy(payloadColor)
                  })
                  if (payload.author === $scope.userId){
                    $scope.userColor = payloadColor;
                  } else {
                    for (var i = 0; i < $scope.data[0].authorTable.length; i++){
                      if ($scope.data[0].authorTable[i].authorId === $scope.userId){
                        var colorYetAssigned = true;
                        break;
                      }


                      // look up the color already assigned to the payload author
                      // if there, the payload will have that color


                    }
                    if (!$scope.colorYetAssigned){
                      $scope.authorTableLength = angular.copy($scope.data[0].authorTable.length); 
                      $scope.pastelsLength = angular.copy($scope.otherPastels.length); 
                      $scope.remarkInputColor = $scope.otherPastels[($scope.authorTableLength - 1)];
                      $scope.remarkInputString = '3px solid ' + $scope.remarkInputColor;
                    }
                    
                  }
                  $scope.colorYetAssigned = false;
                }
              }


              return payloadColor;
      }

      // Makes a new left id and focuses on it
      $scope.clearLeftAdd = function (paragraph) {
        setTimeout(function () {
          paragraph.leftAdd = false;
          $scope.tempStopEditable = false;
          // });
        }, 5);
      }

      $scope.makeTitleEditable = function() {
        document.getElementById('apptitle').contenteditable = true;
      }

      $scope.clearWithLeftAdder = function (id) {
        $scope.unHighlightNode();

        setTimeout(function () {
          $scope.$apply(function () {
            $scope.hasLeftFocus.id = id;
            focusFactory('left'+id);
            if ($scope.editing){
              $scope.clearEditing();
            }
          });
        }, 5);
      };

      $scope.assignLeftId = function (id) {
        setTimeout(function () {
          $scope.$apply(function () {
            $scope.hasLeftFocus.id = id;
          });
        }, 20);
      }

      // Manages top adder selection
      $scope.clearWithTopAdder = function (paragraph) {
        $scope.unHighlightNode();
        $timeout(function () {
          $scope.$apply(function () {
            $scope.selectedProposition = angular.copy({});
            $scope.selectedProposition.textSide = true;
            $scope.hasTopFocus = paragraph.paragraphId;
            paragraph.topAdd = true;
            document.getElementById('top' + paragraph.paragraphId).innerHTML = '';
            $scope.inputs['top' + paragraph.paragraphId] = '';
            focusFactory('top'+paragraph.paragraphId);
          });
        }, 0);
      };

      $scope.clearWithTopNodeAdder = function (node) {
        $timeout(function () {
          $scope.$apply(function () {
            node.topNodeAdd = true;
            $scope.selectedNode = node;
            $scope.selectedProposition = angular.copy({});
            $scope.selectedProposition.textSide = true;
            $scope.topNodeAdderId = IdFactory.next();
            $scope.hasTopNodeFocus = node.nodeId;
            focusFactory($scope.topNodeAdderId);
          });
        }, 0);
      };

      $scope.clearWithBottomNodeAdder = function (node) {
        console.log("Node adder clear")
         
        // $timeout(function () {
        //   $scope.$apply(function () {
        //     node.bottomNodeAdd = true;
        //     $scope.selectedNode = node;
        //     $scope.selectedProposition = angular.copy({});
        //     $scope.selectedProposition.textSide = true;
        //     // focusFactory($scope.bottomNodeAdderId);
        //   });
        // }, 0);
        $timeout(function () {
          $scope.$apply(function () {
            $scope.unHighlightNode();
            $scope.bottomNodeAdderId = IdFactory.next();
            $scope.hasBottomNodeFocus = node.nodeId;
            node.bottomNodeAdd = true;
            node.bottomDropzoneMouseOver = true;
            $scope.selectedNode = node;
            $scope.selectedProposition = angular.copy({});
            $scope.selectedProposition.textSide = true;
            focusFactory($scope.bottomNodeAdderId);
            
            // focusFactory($scope.bottomNodeAdderId);
          });
          
        }, 0);
        $timeout(function () {
          console.log("element: ", document.getElementById($scope.bottomNodeAdderId))
          console.log("Adder id: ", $scope.bottomNodeAdderId)
          focusFactory($scope.bottomNodeAdderId);
          // document.getElementById($scope.bottomNodeAdderId).click();
        }, 0);
        
      };

      // Manages bottom adder selection
      $scope.clearWithBottomAdder = function (paragraph) {
        $scope.unHighlightNode();
        $timeout(function () {
          $scope.$apply(function () {
            paragraph.bottomAdd = true;
            $scope.hasBottomFocus.id = paragraph.paragraphId;
            $scope.hasTopFocus = '';
            $scope.selectedProposition = angular.copy({});
            $scope.selectedProposition.textSide = true;
            if (document.getElementById(paragraph.paragraphId)){
              document.getElementById(paragraph.paragraphId).innerHTML = '';
            }
            
            focusFactory(paragraph.paragraphId);
          });
        }, 10);
      };


      $scope.findFirstProposition = function (paragraph, id) {

        for (var i = 0; i < paragraph.propositions.length; i++) {
          if (paragraph.propositions[i][$scope.userId] !== 'hidden' && paragraph.propositions[i].hiddenForAll !== true) {
            if (paragraph.propositions[i].id === id) {
              return true;
            } else {
              return false;
            }
          }
        }
      };

      $scope.getLastSentenceInParagraph = function (paragraph){
        return
      }

      $scope.reverseCarriageReturn = function (node, paragraph) {
        var visibleRemarkFound;
        for (var i = paragraph.propositions.length - 1; i > -1; i--) {
          for (var j = paragraph.propositions[i].remarks.length - 1; j > -1; j--){
            if (paragraph.propositions[i].remarks[j][$scope.userId] !== 'hidden' &&
            paragraph.propositions[i].remarks[j].hiddenForAll !== true){
              visibleRemarkFound = true;
              var query = paragraph.propositions[i].remarks[j].id;
              $timeout(function () {
                $('#proposition' + query).trigger('click');
              }, 0);
              break;
            }
          }
          if (!visibleRemarkFound){
            if (paragraph.propositions[j][$scope.userId] !== 'hidden' &&
            paragraph.propositions[i].hiddenForAll !== true){
              var query = paragraph.propositions[i].id;
              $timeout(function () {
                $('#proposition' + query).trigger('click');
              }, 0);
              break;
            }
          }
        }
      };

      $scope.carriageReturn = function (node, paragraph) {
          for (var i = paragraph.propositions.length - 1; i > -1; i--) {
            if (paragraph.propositions[i][$scope.userId] !== 'hidden' &&
              paragraph.propositions[i].hiddenForAll !== true &&
              $scope.selectedProposition.type !== 'blank') {
                if ($scope.selectedProposition){
                  document.getElementById($scope.selectedProposition.id).innerText = '';
                }
                
                $scope.selectedProposition = angular.copy({});
                var query = paragraph.paragraphId;
                $timeout(function () {
                  $('#bottomadder' + query).trigger('click');
                }, 0);
                return;

            }
          }

      };

      // Selects proposition (propositions are often selected without this function)
      $scope.selectProposition = function (proposition) {
        if ($scope.selectedProposition) {
          if ($scope.selectedProposition.id !== proposition.id) {
            $scope.clearPropositionInput();
            $scope.selectedProposition = proposition;
            $scope.hasRightFocus.id = proposition.id;
            focusFactory($scope.selectedProposition.id);
          } else {
           

            $scope.selectedProposition = proposition;
            $scope.hasRightFocus.id = proposition.id;
            focusFactory($scope.selectedProposition.id);
          }
        } else {
          

          $scope.selectedProposition = proposition;
          $scope.hasRightFocus.id = proposition.id;
          focusFactory($scope.selectedProposition.id);
        }
        $scope.highlight.id = '';
        $scope.highlight.highlit = null;
        $scope.mark.id = '';
        $scope.mark.marked = null;
        $scope.mark = {};
        $scope.highlight = {};
      };

      $scope.selectPropositionLeft = function (proposition) {
        if ($scope.selectedProposition) {
          if ($scope.selectedProposition.id !== proposition.id) {
            $scope.clearPropositionInput();
            $scope.selectedProposition = proposition;
            $scope.hasLeftFocus.id = proposition.id;
            focusFactory('left'+proposition.id);
          } else {
            $scope.selectedProposition = proposition;
            $scope.hasLeftFocus.id = proposition.id;
            focusFactory('left'+proposition.id);
          }
        } else {
          $scope.selectedProposition = proposition;
          $scope.hasLeftFocus.id = proposition.id;
          focusFactory('left'+proposition.id);
        }
        $scope.highlight.id = '';
        $scope.highlight.highlit = null;
        $scope.mark.id = '';
        $scope.mark.marked = null;
        $scope.mark = {};
        $scope.highlight = {};
      };

      // Clears the proposition input, like when clicked away
      $scope.clearPropositionInput = function () {
        $timeout(function () {
          $scope.$apply(function () {
            console.log("Clear proposition input")
            $scope.inputs = {};
            $scope.highlight.id = '';
            $scope.mark.id = '';
          });
        }, 0);
        
      };

      // Highlights all of another's propositions in a paragraph, first backspace
      $scope.highlightAllPropositions = function (node, paragraph, proposition) {
        $scope.selectedParagraph.highlightAll = true;
      };

      // Marks all of another's propositions in a paragraph, second backspace
      $scope.markAllPropositions = function () {
        $scope.selectedParagraph.markAll = true;
        $scope.selectedParagraph.highlightAll = false;
      };


      // Defines what's been highlighted
      $scope.highlightProposition = function (node, paragraph, proposition) {
        console.log("Highlighting proposition")
        if ($scope.highlight.id !== proposition.id) {
          $scope.highlight.id = proposition.id;
          $scope.highlight.highlit = true;
        }
      };

      $scope.hasRightFocusIdFcn = function(remarks, id) {
          for (var i = 0; i < remarks.length; i++) {
              if (remarks[i].id === id) {
                  return true;
              }
          }
          return false;
      };


      // Defines what's been marked for deletion with additional backspace
      $scope.markProposition = function (proposition) {
        $scope.mark.id = proposition.id;
        $scope.mark.marked = true;
      };

      $scope.toggleRemarksExpansion = function (proposition){
        
        // console.log("proposition remarksexpanded BEFORE: ", angular.copy(proposition.remarksExpanded))
        proposition.remarksExpanded = !proposition.remarksExpanded;
        // console.log("proposition remarksexpanded: AFTER", angular.copy(proposition.remarksExpanded))
      }

      // Processes incomplete edits to one's own propositions
      $scope.clearEditable = function () {
        if ($scope.whatHasBeenClicked) {
          for (var i = 0; i < $scope.propositions.length; i++) {
            if ($scope.whatHasBeenClicked === $scope.propositions[i].id) {
              // is either clearing what has been clicked or somehow made the proposition inaccessible
              document.getElementById('proposition' + $scope.whatHasBeenClicked).innerText = $scope.propositions[i].text;
            }
          }
          document.getElementById('proposition' + $scope.whatHasBeenClicked).contentEditable = false;
          $scope.whatHasBeenClicked = '';
        }
      };

      $scope.alternateSensor = function (proposition) {
        // console.log("Proposition object: ", proposition)

        // console.log("did the other click")
      }

      // For when there is a single click on a proposition
      $scope.listenForDoubleClick = function (element, paragraph, proposition) {
        if (($scope.cancelListenForDoubleClick === true && !$scope.draggingNode &&
          !$scope.draggingParagraph && !$scope.draggingProposition) ||
          ($scope.tempStopEditable && $scope.whatHasBeenClicked === proposition.id)) {

          $scope.cancelListenForDoubleClick = false;
          $scope.selectRight(proposition, paragraph);
          return;
        }
        var string = 'proposition';
        var id = proposition.id;
        string = string + id;
        $scope.selectedParagraph = paragraph;
        $scope.selectedProposition = proposition;
        $scope.selectedProposition.textSide = true;
        $scope.selectedProposition.dialogueSide = false;
        $scope.selectedParagraph.highlightAll = false;
        $scope.selectedParagraph.markAll = false;
        if (!$scope.dontrunfocusout){
          focusFactory(id);
          if ($scope.editing && $scope.editing !== proposition.id){
            $scope.clearEditing();
          }
        }




        if ($scope.whatHasBeenClicked !== proposition.id && !$scope.tempStopEditable) {
          document.getElementById(string).contentEditable = true;
          $scope.whatHasBeenClicked = proposition.id;
          $scope.dontrunfocusout = true;
          $scope.tempStopEditable = false;
          focusFactory(id);
          if ($scope.editing){
            $scope.clearEditing();
          }
        } else if (!$scope.tempStopEditable){
          document.getElementById(string).contentEditable = true;
          $scope.whatHasBeenClicked = proposition.id;
          $scope.dontrunfocusout = true;
          $scope.tempStopEditable = false;
          if ($scope.editing !== proposition.id){
            $scope.editingCopy = angular.copy(proposition.text);
            $scope.editing = angular.copy(proposition.id);
          }
          
        }

      };

      $scope.clearEditing = function (flag) {
        if (!flag){
          for (var i = 0; i < $scope.data[0].nodes.length; i++){
            for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === $scope.editing &&
                  !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll){
                  // setTimeout(function () {
                  //   $scope.$apply(function () {
                      if (!$scope.hasBeenSetUp && $scope.editingCopy){
                        $scope.thisI = angular.copy(i)
                        $scope.thisJ = angular.copy(j)
                        $scope.thisK = angular.copy(k)
                        $scope.thisIsACopy = angular.copy($scope.data[0].nodes[i].paragraphs[j].propositions[k])
                        $scope.data[0].nodes[i].paragraphs[j].propositions[k] = angular.copy({});
                        setTimeout(function () {
                          $scope.$apply(function () {
                            $scope.data[0].nodes[$scope.thisI].paragraphs[$scope.thisJ].propositions[$scope.thisK] = $scope.thisIsACopy;
                            $scope.thisIsACopy = {};
                            $scope.thisI = null;
                            $scope.thisJ = null;
                            $scope.thisK = null;
                            
                          });
                        }, 5);
                       
                        // $scope.updateProposition($scope.data[0].nodes[i], $scope.data[0].nodes[i].paragraphs[j], $scope.data[0].nodes[i].paragraphs[j].propositions[k], 'stale')
                        // document.getElementById('proposition' + $scope.data[0].nodes[i].paragraphs[j].propositions[k].id).textContent = $scope.editingCopy;
                      }
                      $scope.editing = '';
                      $scope.editingCopy = '';
                      console.log("Clear editing clear")
                      $scope.inputs = {};
                      break;
                  //   });
                  // }, 5);
                  // document.getElementById('proposition' + $scope.data[0].nodes[i].paragraphs[j].propositions[k].id).innerText = $scope.editingCopy;
                  // $scope.inputs = {};
                  // break;
                }
              }
            }
          }
        } else {
          $scope.editing = '';
          $scope.editingCopy = '';
          console.log("Other clear editing clear")
          $scope.inputs = {};
        }
        
      }

      $scope.whatIsSelectedProp = function () {
        console.log("Selected proposition: ", angular.copy($scope.selectedProposition));
      }

      // Backstops something about proposition editability
      $scope.focusouteditable = function (element, proposition) {
        if ($scope.dontrunfocusout) {
          return;
        }
        element.contentEditable = false;
        $scope.whatHasBeenClicked = '';
        document.getElementById('proposition' + proposition.id).innerText = proposition.dialogueText;
      };

      // Processes an edit to one's own proposition
      $scope.updateProposition = function (node, paragraph, proposition, flag) {
        // In case an edit out of bounds occurs
        if (proposition.author !== $scope.userId) {
          return;
        }
        // Turns off editability and gets paths to the proposition and paragraph being edited
        var elem = document.getElementById('proposition' + proposition.id);
        elem.contentEditable = false;
        if (elem) {


          var somePath;
          var nodePath;
          var paragraphPath;
          var propositionPath;
          var remarkPath;
          var text = '';





          // var propositionDestination = eval(propositionPath);
          // Copies the current status of the span
          if (!flag){
            text = angular.copy(elem.textContent);
            text = text.replace(/\u00a0/g, ' ');
          } else {
            text = angular.copy(proposition.text);
            text = text.replace(/\u00a0/g, ' ');
          }
          $scope.whatHasBeenClicked = '';
          // Updates the propositions array
          // Defines the payload to be emitted
          prep.payload = {
            nodeId: node.nodeId,
            paragraphId: paragraph.paragraphId,
            id: proposition.type === 'assertion' ? proposition.id : undefined,
            remarkId: proposition.type === 'negation' ? proposition.id : undefined,
            text: text,
            bookId: $scope.bookId
          };
          // Emits it, clears a variable
          chatSocket.emit('update', $scope.userId, prep.payload, $scope.bookId);
          prep = {};
          
          $scope.clearEditing('dontreset');
          
        }
      };

      // Listener for updates
      $scope.$on('socket:broadcastUpdate', function (event, payload) {
        console.log("received update")
        if (payload.bookId !== $scope.bookId) {
          return;
        }
        // Looks up proposition in the propositions array, updates it



        // var index = $scope.propositions.findIndex(function (x) {
        //   return x.id === payload.id;
        // });
        var elem = document.getElementById('proposition' + payload.id);

        if (payload.remarkId){
          var elem = document.getElementById('remark' + payload.remarkId);
        } else if (payload.id){
          var elem = document.getElementById('proposition' + payload.id);
        }

        // Updates text for the proposition in the text

        if (!payload.remarkId){
          for (var i = 0; i < $scope.data[0].nodes.length; i++){
            for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === payload.id &&
                  !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll){
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].text = payload.text;
                  if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks){
                    for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                      $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].hiddenForAll = true;
                    }
                    break;
                  }
                }
                
              }
            }
          }
        } else {
          for (var i = 0; i < $scope.data[0].nodes.length; i++){
            for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                  if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].id === payload.remarkId){
                    $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].text = payload.text;

                  }
                }
              }
            }
          }
        }

        for (var i = 0; i < $scope.data[0].dialogue.length; i++){
          if ($scope.data[0].dialogue[i].id === payload.id){
            $scope.messageToCopy = angular.copy($scope.data[0].dialogue[i]);
            $scope.messageToCopy.text = payload.text;
            $scope.data[0].dialogue.splice(i, 1);
            break;
          }
        }



        $scope.data[0].dialogue.push($scope.messageToCopy);

        $scope.messageToCopy = {};

        if (payload.author === $scope.userId) {
          $timeout(function () {
            elem.click();
          }, 0);
        }
        apiService.updateBook($scope.bookId, JSON.parse(angular.toJson($scope.data[0])));
        // apiService.updatePropositions($scope.bookId, JSON.parse(angular.toJson($scope.propositions)));
        // apiService.updateNegateds($scope.bookId, JSON.parse(angular.toJson($scope.bookId)));


        profileService.setSelectedBook($scope.data[0]);
      });

      $scope.dragNode = function (node, e) {
        setTimeout(function () {
          $scope.$apply(function () {
            $scope.cancelListenForDoubleClick = true;
            $scope.cancelDrop = true;
            $scope.draggingNode = true;
            $scope.draggedNode = angular.copy(node);
            $scope.draggedNode.isDraggedNode = true;
            $scope.draggingParagraph = false;
            $scope.draggedParagraph = {};
            $scope.draggingProposition = false;
            $scope.draggedProposition = {};
            // document.getElementById('dragelement').append(document.getElementById('nodetitle' + $scope.draggedNode.nodeId ));
            $scope.dragStrings.push(
              {
                text: node.topic
              }
            )
            setTimeout(function () {
              $scope.$apply(function () {

                document.getElementById('dragelement').style.left = ((parseInt(e.pageX) * 1.33) + 10).toString() + 'px';
                document.getElementById('dragelement').style.top = (parseInt(e.pageY) * 1.33).toString() + 'px';


              });
            }, 5);
          }, 20);
        })
      }



      $scope.dragParagraph = function (node, paragraph, e) {
        $scope.draggingParagraph = true;
        setTimeout(function () {
          $scope.$apply(function () {
            $scope.cancelListenForDoubleClick = true;
            $scope.cancelDrop = true;
            $scope.draggedParagraph = paragraph;
            $scope.draggedParagraph.isDraggedParagraph = true;

            $scope.draggingNode = false;
            $scope.draggedNode = node;
            $scope.draggingProposition = false;
            $scope.draggedProposition = {};
            $scope.draggedProps = [];
            $scope.dragStrings = [];

            for (var i = 0; i < paragraph.propositions.length; i++){
              if (!paragraph.propositions[i].hiddenForAll){
                paragraph.propositions[i].isPresentlyBeingDragged = true;
                $scope.draggedProps.push(angular.copy(paragraph.propositions[i]));

              }
            }

            for (var i = 0; i < paragraph.propositions.length; i++){
              if (!paragraph.propositions[i].hiddenForAll){
                $scope.dragStrings.push(
                  {
                    text: (paragraph.propositions[i].text + ' ')
                  }
                )

              }
              for (var j = 0; j < paragraph.propositions[i].remarks.length; j++){
                if (!paragraph.propositions[i].remarks[j].rejoined &&
                  !paragraph.propositions[i].remarks[j].hiddenForAll){
                  $scope.dragStrings.push(
                    {
                      text: (paragraph.propositions[i].remarks[j].text + ' ')
                    }
                  )

                }
              }
            }

            setTimeout(function () {
              $scope.$apply(function () {

                document.getElementById('dragelement').style.left = ((parseInt(e.pageX) * 1.33) + 10).toString() + 'px';
                document.getElementById('dragelement').style.top = (parseInt(e.pageY) * 1.33).toString() + 'px';


              });
            }, 5);
          });
        }, 20);
      }

      $scope.dragProposition = function (node, paragraph, proposition, e) {

        $scope.selectedProposition = proposition;
        if ($scope.cancelListenForDoubleClick){
          $scope.cancelListenForDoubleClick = false;
          return;
        }
        console.log("DRAGGING A PROPOSITION")
        if ($scope.draggingProposition){
          return;
        }
        // rewrite for reorderings
        $scope.draggingProposition = true;
        setTimeout(function () {
          $scope.$apply(function () {
            document.getElementById(proposition.id).contentEditable = false
            document.getElementById(proposition.id).blur();
            window.getSelection().removeAllRanges();
            $scope.cancelListenForDoubleClick = true;
            $scope.cancelDrop = true;
            $scope.draggedNode = node;
            $scope.draggedNode = node;
            $scope.draggedParagraph = paragraph;
            $scope.draggedParagraph.isDraggedParagraph = true;
            $scope.draggedProposition = angular.copy(proposition);
            $scope.draggedProposition.isDraggedProposition = true;
            $scope.draggedProps = [angular.copy(proposition)];
            $scope.draggingProposition = true;
            $scope.dragStrings = [];
            $scope.dragStrings.push(
              {
                text: proposition.text
              }
            )
            if (proposition.remarks){
              for (var i = 0; i < proposition.remarks.length; i++){
                if (!proposition.remarks[i].hiddenForAll){
                  $scope.dragStrings.push({
                    text: angular.copy(proposition.remarks[i].text + '  '),
                    type: 'remark'
                  })
                }
              }
            }

            setTimeout(function () {
              $scope.$apply(function () {
                console.log("Getting drag element: ", document.getElementById('dragelement'))
                document.getElementById('dragelement').style.left = ((parseInt(e.pageX) * 1.33) + 10).toString() + 'px';
                document.getElementById('dragelement').style.top = (parseInt(e.pageY) * 1.33).toString() + 'px';


              });
            }, 5);
          });
        }, 20);
      };

      $scope.selectNodeById = function (id) {

      }

      $scope.clearDrag = function () {
        setTimeout(function () {
          $scope.$apply(function () {
            console.log("Clearing drag")
            $scope.tweetClicked = {}
            if ($scope.draggingParagraph) {
              for (var i = 0; i < $scope.draggedParagraph.propositions.length; i++){
                if ($scope.draggedParagraph.propositions[i].isPresentlyBeingDragged){

                  $scope.draggedParagraph.propositions[i].isPresentlyBeingDragged = false;
                }
              }

            } else if ($scope.draggingNode){
              $scope.draggedNode.isPresentlyBeingDragged = false;
            } else if ($scope.draggingProposition) {
              for (var i = 0; i < $scope.draggedParagraph.propositions.length; i++){
                if ($scope.draggedParagraph.propositions[i].isPresentlyBeingDragged){

                  $scope.draggedParagraph.propositions[i].isPresentlyBeingDragged = false;
                }
              }
            }
            $scope.cancelListenForDoubleClick = false;
            $scope.selectedProposition = angular.copy({});
            $scope.draggedNode = {};
            $scope.draggedParagraph = {};
            $scope.draggedProposition = {};
            $scope.draggingNode = false;
            $scope.draggingParagraph = false;
            $scope.draggingProposition = false;
            $scope.dragStrings = [];
            $scope.paragraphMouseIsOver = {};
            if (document.getElementById('tweet-button')){
              document.getElementById('tweet-button').classList.remove('grow')
            }
            
          });
        }, 20);
      };

      $scope.toggleEditorShortening = function () {
        console.log("Toggle Shortening Triggered")
        $scope.shortEditor = !$scope.shortEditor;
      }

      $scope.topNodeClick = function (node, event) {
        // $scope.$apply(function () {
          node.topNodeAdd = true;
          setTimeout(function () {
            document.getElementById($scope.topNodeAdderId).click();
            event.stopPropagation();
          }, 20);
        // });


      }

      $scope.bottomNodeClick = function (node, event) {
          node.bottomNodeAdd = true;
          node.minimized = true;
          setTimeout(function () {

            document.getElementById($scope.bottomNodeAdderId).click();
            event.stopPropagation();
          }, 20);



      }

      $scope.checkIfDropValid = function (node, paragraph, proposition, flag){
        // console.log("Checking if drop valid")
        if (node.sectionClaimedBy !== $scope.userId){
          
          return false;
        }
        var check = {};

        // if the blank paragraph is there, only allow rights
        if ((!node.paragraphs[0].hiddenForAll && flag !== 'right' && flag !== "topnode" && flag !== 'bottomnode') || node.sectionClaimedBy !== $scope.userId){

          return false;
        }

        if ((flag === 'top' && paragraph.first && paragraph.topMouseOver)){
          if ($scope.draggingParagraph){
            if ($scope.draggedParagraph.paragraphId === paragraph.paragraphId){
              return false;
            } else {
              return true;
            }
          } else if ($scope.draggingProposition) {
            var thisCounter = 0;
            for (var i = 0; i < $scope.draggedParagraph.propositions.length; i++){
              if (!$scope.draggedParagraph.propositions[i].hiddenForAll){
                thisCounter++;
              }
            }

            if (thisCounter > 1 || $scope.draggedParagraph.paragraphId !== paragraph.paragraphId){

              return true;
            } else {

              return false;
            }
          } else if ($scope.draggingNode) {
            return false;
          } else {
            // mouseover code
            return true;
          }

        } else if (flag === 'bottom' && paragraph.bottomMouseOver) {
          if ($scope.draggingNode){
            return false;
          } else if ($scope.draggingParagraph){
            if ($scope.draggedParagraph.paragraphId === paragraph.paragraphId){
              return false;
            } else {
              return true;
            }
          } else if ($scope.draggingProposition){
            if ($scope.draggedParagraph.paragraphId === paragraph.paragraphId){
              var validityCounter = 0;
              for (var i = 0; i < $scope.draggedParagraph.propositions.length; i++){
                if (!$scope.draggedParagraph.propositions[i].hiddenForAll){
                  validityCounter++;
                }
              }
              if (validityCounter > 1){
                return true;
              } else {
                return false;
              }

            } else {
              return true;
            }
          } else {
            // mouseover code
            return true;
          }


        } else if (flag === 'left' && proposition.leftMouseOver){
          if ($scope.draggingNode){
            return false;
          } else if ($scope.draggingParagraph){
            if ($scope.draggedParagraph.paragraphId === paragraph.paragraphId){
              return false;
            } else {
              return true;
            }
          } else if ($scope.draggingProposition){
            if ($scope.draggedProposition.id === proposition.id){
              return false;
            } else {
              return false;
            }
          } else {
            return true;
          }

        } else if (flag === 'right' && proposition.mouseOver){
          if ($scope.draggingNode){
            return false;
          } else if ($scope.draggingParagraph){
            if ($scope.draggedParagraph.paragraphId === paragraph.paragraphId){
              return false;
            } else {
              return true;
            }
          } else if ($scope.draggingProposition){
            if ($scope.draggedProposition.id === proposition.id){
              return false;
            } else {
              return false;
            }
          } else {
            return true;
          }


        } else if (flag === 'topnode' && node.topDropzoneMouseOver){
          if ($scope.draggingNode && node.nodeId !== $scope.draggedNode.nodeId){
            return true;
          } else if ($scope.draggingParagraph){
            return false;
          } else if ($scope.draggingProposition){
            return false;
          } else {
            return false;
          }
        } else if (flag === 'bottomnode' && node.bottomDropzoneMouseOver){
          if ($scope.draggingNode && node.nodeId !== $scope.draggedNode.nodeId){

            return true;
          } else if ($scope.draggingParagraph){

            return false;
          } else if ($scope.draggingProposition){

            return false;
          } else {

            return false;
          }
        } else {
          return false;
        }

      }

      $scope.didItRun = function (id) {
        // $scope.hasChatFocusId = id;
        console.log("It ran")
      }

      $scope.didItRunOk = function (event) {
        console.log("It ran okay")
        console.log("That event is: ", event)
      }

      $scope.leftOlClickHandle = function (node, paragraph, event) {
        var relX = event.pageX - $('#propositionsol' + paragraph.paragraphId).offset().left;
        console.log("Relx: ", relX)
        if (relX > -14){
          $scope.getLastVisiblePropositionInParagraph(node, paragraph, event)
        }

        
      }

      $scope.getReading = function (event, id) {
        var relX = event.pageX - $('#propositionsol' + id).offset().left;
          var relY = event.pageY - $('#propositionsol' + id).offset().top;
      }

      $scope.getPropReading = function (event, proposition, node) {
        if ($scope.userId !== node.sectionClaimedBy || $scope.hasBeenSetUp){
          return;
        }
        var relX = event.pageX - $('#wholeprop' + proposition.id).offset().left;
          var relY = event.pageY - $('#wholeprop' + proposition.id).offset().top;
          if (relX < -14 && proposition.first){
            setTimeout(function () {
              document.getElementById('left'+ proposition.id).click();
            }, 20);
            
          }
          // console.log('height: ', $('#wholeprop' + proposition.id).height)
      }

      $scope.dropItem = function (node, paragraph, proposition, flag, element, event) {
        if (flag === 'ol'){
          // disambiguate 'ol' as there are multiple ols
        }
        // console.log("That element: ", $('#paragraphsol' + paragraph.paragraphId))
        if (element && event && flag === 'ol'){
          var relX = event.pageX - $('#propositionsol' + paragraph.paragraphId).offset().left;
          var relY = event.pageY - $('#propositionsol' + paragraph.paragraphId).offset().top;
          console.log(event.pageX, ", ", event.pageY)
          console.log($('#propositionsol' + paragraph.paragraphId).offset().left, ", ", $('#propositionsol' + paragraph.paragraphId).offset().top)
          console.log(relX, ", ", relY)
          if (relX < 30){
            console.log("left ol")
            flag = 'left';
            for (var i = 0; i < paragraph.propositions.length; i++){
              if (!paragraph.propositions[i].hiddenForAll){
                proposition = paragraph.propositions[i];
                flag = 'left';
                break;
              }
            }
          } else {
            console.log("right ol")
            for (var i = paragraph.propositions.length-1; i > -1; i--){
              if (!paragraph.propositions[i].hiddenForAll){
                proposition = paragraph.propositions[i];
                flag = 'right';
                break;
              }
            }
          }
        }

        setTimeout(function () {
          $scope.$apply(function () {
            console.log("Drop item timeout")
            $scope.dragStrings = [];
            $scope.targetNode = node;


            if ($scope.draggingNode){
              $scope.deleteProposition($scope.draggedNode, null, null, null, 'node', true);
              setTimeout(function () {
                // prepProposition = function (input, node, paragraph, proposition, event, draggedProps, propositionToSetLaterPosition)
                $scope.prepProposition($scope.draggedNode.topic, node, paragraph, proposition, null, flag);

                // $scope.prepProposition = function (input, thread, proposition, paragraph, event, draggedProps)
                $scope.draggedNode = {};
                $scope.draggedParagraph = {};
                $scope.draggedProposition = {};
                $scope.draggingNode = null;
                $scope.draggingParagraph = null;
                $scope.draggingProposition = null;
                $scope.cancelListenForDoubleClick = false;
              }, 20);

            } else if ($scope.draggingParagraph){
              console.log("bottomadd: ", angular.copy(paragraph.bottomAdd))
              console.log("topadd: ", angular.copy(paragraph.topAdd))
              console.log("topmouseover: ", angular.copy(paragraph.topMouseOver))
              console.log("topmouseover: ", angular.copy(paragraph.topMouseOver))
              console.log("flag eh: ", angular.copy(flag))
              if (paragraph.paragraphId === $scope.draggedParagraph.paragraphId && !paragraph.bottomAdd && 
              !paragraph.topAdd && !paragraph.topMouseOver){
                $scope.clearDrag();
                console.log("Returning invalid paragraph drop")
                return;
              }
              
              for (var i = 0; i < $scope.draggedParagraph.propositions.length; i++){
                if ($scope.draggedParagraph.propositions[i].isPresentlyBeingDragged){
                  $scope.draggedParagraph.propositions[i].isPresentlyBeingDragged = false;
                }
              }
              $scope.deleteProposition($scope.draggedNode, $scope.draggedParagraph, null, null, 'paragraph', true);
              setTimeout(function () {
                console.log("flag in timeout: ", angular.copy(flag))
                // prepProposition = function (input, node, paragraph, proposition, event, draggedProps, propositionToSetLaterPosition)
                $scope.prepProposition(null, node, paragraph, proposition, null, flag);

                // $scope.prepProposition = function (input, thread, proposition, paragraph, event, draggedProps)
                $scope.draggedNode = {};
                $scope.draggedParagraph = {};
                $scope.draggedProposition = {};
                $scope.draggingNode = null;
                $scope.draggingParagraph = null;
                $scope.draggingProposition = null;
                $scope.cancelListenForDoubleClick = false;
              }, 20);
            } else if ($scope.draggingProposition){
              console.log('Into that dragging proposition')

              if (flag === 'ol'){
                // 
              }


              if (flag === 'left'){
                console.log("Flag is left")
                if (proposition.id === $scope.draggedProposition.id){
                  $scope.cancelListenForDoubleClick = false;
                  paragraph.leftAdd = false;
                  $scope.clearDrag();
                  console.log("Returning for invalid left drop")
                  return;
                }
              }

              $scope.deleteProposition($scope.draggedNode, $scope.draggedParagraph, $scope.draggedProposition, null, 'proposition', true);
              setTimeout(function () {
                // prepProposition = function (input, thread, proposition, paragraph, event, draggedProps, propositionToSetLaterPosition)
                $scope.prepProposition($scope.draggedProposition.text, node, paragraph, proposition, null, flag);
                $scope.draggedNode = {};
                $scope.draggedParagraph = {};
                $scope.draggedProposition = {};
                $scope.draggingNode = null;
                $scope.draggingParagraph = null;
                $scope.draggingProposition = null;
                $scope.cancelListenForDoubleClick = false;

                // clear preselecteds
                for (var i = 0; i < $scope.data[0].nodes.length; i++){
                  for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
                    for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                      $scope.data[0].nodes[i].paragraphs[j].propositions[k].preSelected = false;
                      for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                        $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].preSelected = false;
                      }        
                    }
                  }
                }


              }, 20);
            }



            if (flag === 'left'){
              paragraph.leftAdd = true;
            }



            if ($scope.cancelDrop) {
              $scope.cancelDrop = false;
            }
            if (proposition) {
              if (proposition.id === $scope.draggedProposition.id && flag === 'right') {
                $scope.clearDrag();
                return;
              }
            }
            apply = {};
            // deleteProposition(node, paragraph, proposition, remark, modifier, dropflag)

          });
        }, 20);
      };

      // $scope.highlightNode = function (node){
      //   console.log("Highlight node")
      //   for (var i = 0; i < $scope.data[0].nodes.length; i++){
      //     for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
      //       for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
      //         $scope.data[0].nodes[i].paragraphs[j].propositions[k].highlighted = true;
      //         for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
      //           $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].highlighted = true;
      //         }
      //       }
      //     }
      //   }

      // }

      $scope.catchFunction = function () {
        console.log("Cancel listen for double click: ", angular.copy($scope.cancelListenForDoubleClick))
      }

      $scope.highlightParagraph = function (node, paragraph){
        console.log("Highlighting paragraph")
        for (var i = 0; i < $scope.data[0].nodes.length; i++){
          for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){

            if (paragraph.paragraphId === $scope.data[0].nodes[i].paragraphs[j].paragraphId){

              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                $scope.data[0].nodes[i].paragraphs[j].propositions[k].highlighted = true;
                for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].highlighted = true;
                }
              }
            }
          }
        }
        $scope.thereIsAHighlightedParagraph = true;
        $scope.highlightedParagraph = paragraph;
        $scope.highlightedParagraphNode = node;
      }

      $scope.unHighlightParagraph = function (){
        for (var i = 0; i < $scope.data[0].nodes.length; i++){
          for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){


              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                $scope.data[0].nodes[i].paragraphs[j].propositions[k].highlighted = false;
                $scope.data[0].nodes[i].paragraphs[j].propositions[k].marked = false;
                for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].highlighted = false;
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].marked = false;
                }
              
            }
          }
        }
        $scope.thereIsAHighlightedParagraph = false;
        $scope.highlightedParagraph = {};
        $scope.highlightedParagraphNode = {};
      }

      // $scope.currentItem = function(input) {
      //   console.log("Current iteming")
      //     if (!input || !input.length){
      //       console.log("No input")
      //       return [];
      //     } 
            

      //         // Ensure we skip items where rejoined is true
      //         while (input[$scope.currentRemarkIndex % input.length].rejoined) {
      //             console.log("Current remark index: ", angular.copy($scope.currentRemarkIndex))
      //             $scope.currentRemarkIndex++; // Move to the next item if current is rejoined
      //         }

      //         return [input[$scope.currentRemarkIndex % input.length]];
      // };

      $scope.currentItem = function(input) {
          

          if (!input || !input.length) {
              console.log("No input");
              return [];
          }

          let counter = 0; // Counter to ensure we don't loop infinitely
          
          // Ensure we skip items where rejoined is true
          while (input[$scope.currentRemarkIndex % input.length].rejoined) {
              console.log("Current remark index: ", $scope.currentRemarkIndex);
              $scope.currentRemarkIndex++; // Move to the next item if current is rejoined
              counter++;

              // Keep currentRemarkIndex within bounds of the array's length
              $scope.currentRemarkIndex %= input.length;

              // Break the loop if we've checked all items in the input array
              if (counter >= input.length) {
                  return [];
              }
          }

          return [input[$scope.currentRemarkIndex % input.length]];
      };









      $scope.reloadRemark = function() {
          if ($scope.proposition && $scope.proposition.remarks && $scope.proposition.remarks.length) {
              // Toggle the last remark to trigger ng-repeat's re-evaluation.
              var temp = $scope.proposition.remarks.pop();
              $scope.proposition.remarks.unshift(temp);
          }
      };

      $scope.nextRemark = function() {
          $scope.currentRemarkIndex++;
      };

      $scope.highlightNode = function (node){
        for (var i = 0; i < $scope.data[0].nodes.length; i++){
          if (node.nodeId === $scope.data[0].nodes[i].nodeId){
            for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                $scope.data[0].nodes[i].paragraphs[j].propositions[k].highlighted = true;
                for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].highlighted = true;
                }
              }
            }
          }
        }
        $scope.thereIsAHighlightedNode = true;
        $scope.highlightedNode = node;
      }

      $scope.unHighlightNode = function (){
        // console.log("Unhighlight node")
        if ($scope.thereIsAHighlightedNode){
          for (var i = 0; i < $scope.data[0].nodes.length; i++){
            if ($scope.data[0].nodes[i].nodeId === $scope.highlightedNode.nodeId){
              for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
                for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].highlighted = false;
                  for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                    $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].highlighted = false;
                  }
                }
              }
            }
          }
        }
        
        $scope.thereIsAHighlightedNode = false;
        $scope.highlightedNode = {};
      }

      $scope.markNode = function (){
        console.log("Mark node")
        console.log("mark node highlighted node: ", $scope.highlightedNode)
        for (var i = 0; i < $scope.data[0].nodes.length; i++){
          if ($scope.highlightedNode.nodeId === $scope.data[0].nodes[i].nodeId){
            for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                $scope.data[0].nodes[i].paragraphs[j].propositions[k].highlighted = false;
                $scope.data[0].nodes[i].paragraphs[j].propositions[k].marked = true;
                for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].highlighted = false;
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].marked = true;
                }
              }
            }
          }
          
        }
        $scope.thereIsAMarkedNode = true;
        $scope.markedNode = angular.copy($scope.highlightedNode)
        $scope.highlightedNode = {};
        
        $scope.thereIsAHighlightedNode = false;
        console.log("Marked node: ", $scope.markedNode)

      }

      $scope.markParagraph = function (){
        console.log("marking paragraph")
        for (var i = 0; i < $scope.data[0].nodes.length; i++){
          for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
            if ($scope.highlightedParagraph.paragraphId === $scope.data[0].nodes[i].paragraphs[j].paragraphId){
              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                $scope.data[0].nodes[i].paragraphs[j].propositions[k].highlighted = false;
                $scope.data[0].nodes[i].paragraphs[j].propositions[k].marked = true;
                for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].highlighted = false;
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].marked = true;
                }
              }
            }
          }
        }
        console.log('The highlighted paragraph: ' ,$scope.highlightedParagraph)
        $scope.thereIsAHighlightedParagraph = false;
        $scope.thereIsAMarkedParagraph = true;
      }

      $scope.deleteProposition = function (node, paragraph, proposition, remark, modifier, dropflag) {
        console.log("Deletion")
        console.log('Node: ', node)
        console.log('Paragraph: ', paragraph)
        console.log('Proposition: ', proposition)
        console.log('Remark: ', remark)
        console.log('Modifier: ', modifier)
        console.log('Dropflag: ', dropflag)

        if (modifier === 'node'){
          console.log("node deletion")
          if ($scope.draggingNode){
            console.log("if dragging node")
            prep.sectionNumber = $scope.draggedNode.sectionNumber;
            prep.sectionLevel = $scope.draggedNode.sectionLevel;
            prep.nodeId = $scope.draggedNode.nodeId;
          } else {
            console.log("else dragging node")
            
            // if (!node){
              prep.sectionNumber = $scope.highlightedNode.sectionNumber;
              prep.sectionLevel = $scope.highlightedNode.sectionLevel;
              prep.nodeId = $scope.highlightedNode.nodeId;
              console.log("delete proposition highlighted node: ", $scope.highlightedNode)
            // }
            
          }


          for (var i = 0; i < $scope.data[0].nodes.length; i++){
            if ($scope.data[0].nodes[i].nodeId !== node.nodeId &&
              !$scope.data[0].nodes[i].hiddenForAll){
              prep.blankDocument = false;
              break;
            }
          }
          if (prep.blankDocument !== false){
            prep.blankDocument = true;
          }

          $scope.thereIsAMarkedNode = false;
          $scope.markedNode = {};
        } else if (modifier === 'paragraph'){
          console.log("paragraph deletion")

          prep.sectionNumber = node.sectionNumber;
          prep.paragraphId = paragraph.paragraphId;
          for (var i = 0; i < $scope.data[0].nodes[prep.sectionNumber].paragraphs.length; i++){
            if ($scope.data[0].nodes[prep.sectionNumber].paragraphs[i].paragraphId !== prep.paragraphId &&
              !$scope.data[0].nodes[prep.sectionNumber].paragraphs[i].theBlankParagraph &&
              !$scope.data[0].nodes[prep.sectionNumber].paragraphs[i].hiddenForAll){

              prep.blankNode = false;
              break;
            }
          }
          if (prep.blankNode !== false){
            prep.blankNode = true;
          }


        } else if (modifier === 'proposition'){

          console.log("prop deletion")

          prep.sectionNumber = node.sectionNumber;
          prep.paragraphId = paragraph.paragraphId;
          prep.id = proposition.id;





        } else if (modifier === 'remark'){
          console.log("remark deletion")

          prep.sectionNumber = node.sectionNumber;
          prep.nodeId = node.nodeId;
          prep.paragraphId = paragraph.paragraphId;
          prep.id = proposition.id;
          prep.remarkId = remark.id;

          if (remark.author === $scope.userId){
            prep.deletesOwnRemark = true;
          } else {
            prep.deletesOwnRemark = false;
          }

        }



        prep.payload = {
          nodeId: prep.nodeId ? prep.nodeId : undefined,
          paragraphId: prep.paragraphId ? prep.paragraphId : undefined,
          beforeParagraphId: prep.beforeParagraphId ? prep.beforeParagraphId : undefined,
          id: prep.paragraphId ? prep.id : undefined,
          remarkId: prep.remarkId ? prep.remarkId : undefined,
          blankParagraph: prep.blankParagraph ? prep.blankParagraph : undefined,
          blankNode: prep.blankNode ? prep.blankNode : undefined,
          blankDocument: prep.blankDocument ? prep.blankDocument : undefined,
          sectionNumber: prep.sectionNumber ? prep.sectionNumber : undefined,
          sectionLevel: prep.sectionLevel ? prep.sectionLevel : undefined,
          deletesOwnRemark : prep.deletesOwnRemark ? prep.deletesOwnRemark : undefined,
          nodeBlankId: IdFactory.next(),
          paragraphBlankId: IdFactory.next(),
          blankId: IdFactory.next(),
          deleter: $scope.userId,
          bookId: $scope.bookId,
          modifier: modifier,
          dropflag: dropflag,

        };

        chatSocket.emit('deletion', $scope.userId, prep.payload, $scope.bookId);
        prep = {};
        apiService.updateBook($scope.bookId, JSON.parse(angular.toJson($scope.data[0])));
        // apiService.updatePropositions($scope.bookId, JSON.parse(angular.toJson($scope.propositions)));
        profileService.setSelectedBook($scope.data[0]);
      };

      $scope.$on('socket:broadcastDeletion', function (event, payload) {
        console.log("Received deletion: ", payload)

        apply = {};

        if (payload.bookId !== $scope.bookId) {
          return;
        }

        if (payload.modifier === 'node'){

          $scope.data[0].nodes[payload.sectionNumber].hiddenForAll = true;
          if (payload.dropflag){
            $scope.data[0].nodes[payload.sectionNumber].droppedElsewhere = true;
          }
          for (var i = 0; i < $scope.data[0].nodes[payload.sectionNumber].paragraphs.length; i++){

            $scope.data[0].nodes[payload.sectionNumber].paragraphs[i].hiddenForAll = true;
            if (payload.dropflag){
              $scope.data[0].nodes[payload.sectionNumber].paragraphs[i].droppedElsewhere = true;
            }
            for (var j = 0; j < $scope.data[0].nodes[payload.sectionNumber].paragraphs[i].propositions.length; j++){
              $scope.data[0].nodes[payload.sectionNumber].paragraphs[i].propositions[j].hiddenForAll = true;
              if (payload.dropflag){
                $scope.data[0].nodes[payload.sectionNumber].paragraphs[i].propositions[j].droppedElsewhere = true;
              }
              if ($scope.data[0].nodes[payload.sectionNumber].paragraphs[i].propositions[j].remarks){
                console.log("Has remarks right")
                for (var k = 0; k < $scope.data[0].nodes[payload.sectionNumber].paragraphs[i].propositions[j].remarks.length; k++){
                  $scope.data[0].nodes[payload.sectionNumber].paragraphs[i].propositions[j].remarks[k].hiddenForAll = true;
                  if (payload.dropflag){
                    $scope.data[0].nodes[payload.sectionNumber].paragraphs[i].propositions[j].remarks[k].droppedElsewhere = true;
                  }
                }
              }
              
            }
          }

          if ($scope.userId !== payload.author &&
            $scope.selectedNode.nodeId === payload.nodeId){
            console.log("Clearing EVERYTHING")
            $scope.selectedNode = {};
            $scope.selectedParagraph = {};
            $scope.selectedProposition = angular.copy({});
            $scope.selectedRemark = {};
          }
        } else if (payload.modifier === 'paragraph'){
          if (!payload.blankNode){
            for (var i = 0; i < $scope.data[0].nodes.length; i++){
              for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
                if ($scope.data[0].nodes[i].paragraphs[j].paragraphId === payload.paragraphId){
                  for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                    $scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll = true;
                    if (payload.dropflag){
                      $scope.data[0].nodes[i].paragraphs[j].propositions[k].droppedElsewhere = true;
                    }
                    $scope.data[0].nodes[i].paragraphs[j].propositions[k].highlighted = false;
                    $scope.data[0].nodes[i].paragraphs[j].propositions[k].marked = false;
                  }
                  $scope.data[0].nodes[i].paragraphs[j].hiddenForAll = true;
                  if (payload.dropflag){
                    $scope.data[0].nodes[i].paragraphs[j].droppedElsewhere = true;
                  }
                  break;
                }
              }
            }

          } else {
            for (var i = 0; i < $scope.data[0].nodes.length; i++){
              for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
                if ($scope.data[0].nodes[i].paragraphs[j].paragraphId === payload.paragraphId){
                  apply.i = angular.copy(i);
                  for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                    $scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll = true;
                    if (payload.dropflag){
                      $scope.data[0].nodes[i].paragraphs[j].propositions[k].droppedElsewhere = true;
                    }
                    $scope.data[0].nodes[i].paragraphs[j].propositions[k].highlighted = false;
                    $scope.data[0].nodes[i].paragraphs[j].propositions[k].marked = false;
                  }
                  $scope.data[0].nodes[i].paragraphs[j].hiddenForAll = true;
                  if (payload.dropflag){
                    $scope.data[0].nodes[i].paragraphs[j].droppedElsewhere = true;
                  }
                  $scope.data[0].nodes[apply.i].paragraphs[0].hiddenForAll = false;
                  $scope.data[0].nodes[apply.i].paragraphs[0].propositions[0].hiddenForAll = false;
                  
                  break;

                }
              }
            }
            setTimeout(function () {
              document.getElementById('proposition' + $scope.data[0].nodes[apply.i].paragraphs[0].propositions[0].id).click();
            }, 20);
          }

          if ($scope.userId !== payload.author &&
            $scope.selectedParagraph.paragraphId === payload.paragraphId){
            console.log("Clearing EVERYTHING PARAGRAPH")
            $scope.selectedNode = {};
            $scope.selectedParagraph = {};
            $scope.selectedProposition = angular.copy({});
            $scope.selectedRemark = {};
          }

        } else if (payload.modifier === 'proposition'){
          for (var i = 0; i < $scope.data[0].nodes.length; i++){
            for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === payload.id &&
                  !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll &&
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k][$scope.userId] !== 'hidden'){
                  apply.i = angular.copy(i)
                  apply.j = angular.copy(j);
                  apply.k = angular.copy(k);
                  if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks){
                    for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                      $scope.data[0].nodes[apply.i].paragraphs[j].propositions[k].remarks[m].hiddenForAll = true;
                      if (payload.dropflag){
                        $scope.data[0].nodes[apply.i].paragraphs[j].propositions[k].remarks[m].droppedElsewhere = true;
                      }
                    }
                  }
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll = true;
                  if (payload.dropflag){
                    $scope.data[0].nodes[i].paragraphs[j].propositions[k].droppedElsewhere = true;
                  }
                  break;
                }
              }
            }
          }

          // does it blank the paragraph, the node, and what is to be clicked?
          for (var j = 0; j < $scope.data[0].nodes[apply.i].paragraphs.length; j++){
            if ($scope.data[0].nodes[apply.i].paragraphs[j].paragraphId !== payload.paragraphId &&
              !$scope.data[0].nodes[apply.i].paragraphs[j].hiddenForAll){
           
              apply.blankNode = false;
            }
          }
          for (var k = 0; k < $scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions.length; k++){
           
            if ($scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[k].id !== payload.id &&
              !$scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[k].hiddenForAll){
              
              apply.blankNode = false;
            }
          }
          if (apply.blankNode !== false){
            // you blank the node. first blank the prop's paragraph, then resurrect the blank paragraph, and click the blank prop
            $scope.data[0].nodes[apply.i].paragraphs[apply.j].hiddenForAll = true;
            if (payload.dropflag){
              $scope.data[0].nodes[apply.i].paragraphs[apply.j].droppedElsewhere = true;
            }
            $scope.data[0].nodes[apply.i].paragraphs[0].hiddenForAll = false;
            $scope.data[0].nodes[apply.i].paragraphs[0].propositions[0].hiddenForAll = false;
            apply.sorted = true;
            setTimeout(function () {
              document.getElementById('proposition' + $scope.data[0].nodes[apply.i].paragraphs[0].propositions[0].id).click();
            }, 20);

          }
          if (!apply.sorted){

            for (var k = 0; k < $scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions.length; k++){
              if($scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[k].id !== payload.id &&
                !$scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[k].hiddenForAll){
                apply.blankParagraph = false;
                break;
              }
            }

            if (apply.blankParagraph === false) {
              for (var m = (apply.k-1); m > -1; m--){
                if (!$scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[m].hiddenForAll){
                  apply.thisM = angular.copy(m)
                  apply.sorted = true;
                  setTimeout(function () {

                    document.getElementById('proposition' + $scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[apply.thisM].id).click();
                  }, 20);

                  break;
                }
              }
            }


            if (apply.blankParagraph !== false){
              $scope.data[0].nodes[apply.i].paragraphs[apply.j].hiddenForAll = true;
              if (payload.dropflag){
                $scope.data[0].nodes[apply.i].paragraphs[apply.j].droppedElsewhere = true;
              }
              for (var j = (apply.j-1); j > -1; j--){
                if (!$scope.data[0].nodes[apply.i].paragraphs[j].hiddenForAll && !apply.sorted){
                  for (var k = $scope.data[0].nodes[apply.i].paragraphs[j].propositions.length-1; k > -1; k--){
                    if (!$scope.data[0].nodes[apply.i].paragraphs[j].propositions[k].hiddenForAll && !apply.sorted){

                      apply.thisJ = angular.copy(j)
                      apply.thisK = angular.copy(k)
                      apply.sorted = true;
                      setTimeout(function () {
                        document.getElementById('proposition' + $scope.data[0].nodes[apply.i].paragraphs[apply.thisJ].propositions[apply.thisK].id).click();
                      }, 20);

                      break;
                    }
                  }
                }
              }
            }
          }


            if ($scope.selectedProposition){
              if ($scope.userId !== payload.author &&
                $scope.selectedProposition.id === payload.id){
                  console.log("Clearing EVERYTHING remark")
                  $scope.selectedNode = {};
                  $scope.selectedParagraph = {};
                  $scope.selectedProposition = angular.copy({});
                  $scope.selectedRemark = {};
              }
            }
            
          

        } else if (payload.modifier === 'remark'){

          for (var i = 0; i < $scope.data[0].nodes.length; i++){
            for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
              for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                  if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].id === payload.remarkId){
                    apply.path = '$scope.data[0].nodes[' + i.toString() +
                    '].paragraphs[' + j.toString() + '].propositions[' + k.toString() + ']';
                   
                      apply.i = angular.copy(i)
                      apply.j = angular.copy(j)
                      apply.k = angular.copy(k)
                      apply.m = angular.copy(m)
                      $scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[apply.k].remarks[apply.m].hiddenForAll = true;
                      if (payload.dropflag){
                        $scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[apply.k].remarks[apply.m].droppedElsewhere = true;
                      }
                      for (var n = m; n > -1; n--){
                        if (!$scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[apply.k].remarks[n].hiddenForAll &&
                          $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[n][$scope.userId] !== 'hidden' &&
                          $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[n].id !== $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].id){
                          setTimeout(function () {
                              document.getElementById('remark' + $scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[apply.k].remarks[n].id).click();
                          }, 20);
                          break;
                        }
                      }
                      setTimeout(function () {
                          document.getElementById('proposition' + $scope.data[0].nodes[apply.i].paragraphs[apply.j].propositions[apply.k].id).click();
                          
                      }, 20); 
                      break;

                  }
                }
              }
            }
          }

          if ($scope.userId !== payload.author &&
            $scope.selectedRemark.id === payload.remarkId){
            console.log("Clearing EVERYTHING deletion")
            $scope.selectedNode = {};
            $scope.selectedParagraph = {};
            $scope.selectedProposition = angular.copy({});
            $scope.selectedRemark = {};
          }

        }

        // assigns firsts to propositions DELETION
        if (!payload.dropflag){
          $scope.assignFirstsToNodes();
        }


        $scope.scroll = {};


        apiService.updateBook($scope.bookId, JSON.parse(angular.toJson($scope.data[0])));
        // apiService.updatePropositions($scope.bookId, JSON.parse(angular.toJson($scope.propositions)));
        profileService.setSelectedBook($scope.data[0]);
      });

      $scope.hideNode = function (node) {
        node[$scope.userId] = 'hidden';

        apiService.updateBook($scope.bookId, JSON.parse(angular.toJson($scope.data[0])));
        // apiService.updatePropositions($scope.bookId, JSON.parse(angular.toJson($scope.propositions)));
        profileService.setSelectedBook($scope.data[0]);

      };



      $scope.setNewProp = function () {
        console.log("Clearing EVERYTHING set new prop")
        $scope.newProp = true;
        $scope.selectedProposition = angular.copy({});
        $scope.selectedParagraph = {};
      };

      $scope.updateNode = function (node) {

        // In case an edit out of bounds occurs
        if ($scope.data[0].documentClaimedBy !== $scope.userId) {
          return;
        }
        // Turns off editability and gets paths to the proposition and paragraph being edited
        if (!node){
          var elem = document.getElementById('apptitle');

        } else {
          var elem = document.getElementById('nodetitle' + node.nodeId);
        }
        elem.contentEditable = false;
        if (elem) {


          var somePath;
          var nodePath;
          var paragraphPath;
          var propositionPath;
          var remarkPath;
          var text = '';


          // Copies the current status of the span
          text = angular.copy(elem.textContent);
          text = text.replace(/\u00a0/g, ' ');
          $scope.whatHasBeenClicked = '';
          // Updates the propositions array
          // Defines the payload to be emitted
          prep.payload = {
            nodeId: node ? node.nodeId : undefined,
            text: text,
            bookId: $scope.bookId
          };
          // Emits it, clears a variable
          chatSocket.emit('nodeUpdate', $scope.userId, prep.payload, $scope.bookId);
          console.log('Payload of node update: ', prep.payload);
          prep = {};
        }
      }

      $scope.$on('socket:broadcastNodeUpdate', function (event, payload) {
        console.log("Received node update")
        if (payload.bookId !== $scope.bookId) {
          return;
        }
        // Looks up proposition in the propositions array, updates it



        // var index = $scope.propositions.findIndex(function (x) {
        //   return x.id === payload.id;
        // });
        if (payload.nodeId){
          var elem = document.getElementById('nodetitle' + payload.nodeId);
        } else {
          var elem = document.getElementById('apptitle');
        }




        // Updates text for the proposition in the section


        if (payload.nodeId){
          for (var i = 0; i < $scope.data[0].nodes.length; i++){
            if ($scope.data[0].nodes[i].nodeId === payload.nodeId){
              $scope.data[0].nodes[i].topic = payload.text;
            }
          }
        } else {
          $scope.data[0].nodes[0].topic = payload.text
          $scope.title = payload.text;
        }





        apiService.updateBook($scope.bookId, JSON.parse(angular.toJson($scope.data[0])));
        apiService.updatePropositions($scope.bookId, JSON.parse(angular.toJson($scope.propositions)));
        profileService.setSelectedBook($scope.data[0]);
      });

      $scope.setNodeEditability = function (node) {
        console.log("Setting node editability")
        if (node){
          document.getElementById('nodetitle' + node.nodeId).contentEditable = true;
        } else {
          document.getElementById('apptitle').contentEditable = true;
        }
      }

      $scope.hideZeeky = function () {
        
        $scope.isFresh = false;
        if (document.getElementById('zeekynegation')){
          document.getElementById('zeekynegation').style.display = 'none';
        }
        if (document.getElementById('zeekyprop')){
          document.getElementById('zeekyprop').style.display = 'none';
        }
        
      }

      $scope.whatsGoingOn = function (paragraph) {
        console.log("State of top add before sending out prop: ", angular.copy(paragraph))
        if ($scope.hasBeenSetUp){
          focusFactory('top'+paragraph.paragraphId)
        }
      }



      $scope.prepProposition = function (input, node, paragraph, proposition, event, flag, automatedAuthor, automatedCode, authorNumber, rejoinderMessaged, onRemarkId ) {
        console.log("Prepping prop: ", input)
        if ($scope.selectedProposition){
          console.log("SP: ", angular.copy($scope.selectedProposition))
        } else {
          console.log("No selected prop")
        }

        if (node){
          console.log("Section claimed by: ", angular.copy(node.sectionClaimedBy))
        } else {
          console.log("no node claimed by")
        }
        
        console.log("Event: ", angular.copy(event))
        console.log("Automated code: ", angular.copy(automatedCode))


        if (paragraph){
          
          if (document.getElementById('top' + paragraph.paragraphId)){
            console.log("Clearing top innerHTML")
            document.getElementById('top' + paragraph.paragraphId).innerHTML = '';
          }

          if (document.getElementById(paragraph.paragraphId)){
            console.log("Clearing bottom innerHTML")
            
            document.getElementById(paragraph.paragraphId).innerHTML = '';
          }
        }

        // if (chatSocket.connected) {
        //   console.log("Connected right now")
        // } else {
        //   console.log('Socket not connected');
        // }


        if ((!input || input == '<br><br>') && !$scope.draggingParagraph && !$scope.hasBeenSetUp){
          console.log("Returning for lack of input otherwise uncaught");
          $scope.carriageReturn(node, paragraph);
          $scope.inputs = {};
          return;
        }
        $scope.data[0].isFresh = false;

        if ($scope.data[0].dialogue){
          for (var i = 0; i < $scope.data[0].dialogue.length; i++){
            if ($scope.data[0].dialogue[i].author === $scope.userId){
              $scope.onTheBoard = true;
              $scope.thisMoveCounter++;
              break;
            }
          }
        }

        

        $scope.theseInputs.push(angular.copy(input));

        if ($scope.selectedParagraph) {
          $scope.selectedParagraph.highlightAll = false;
          $scope.selectedParagraph.markAll = false;
        }

        apply = {};

        if (proposition) {
          proposition.propositionPreSelected = false;
        }
        if (paragraph){
          paragraph.disableRightCursor = false;
        } else {
          var paragraph = $scope.selectedParagraph;
        }

        //blur active element
        document.activeElement.blur();

        if (input){
          prep.firstChar = input.charAt(0);
          prep.lastChar = input.charAt(input.length - 1);
        } else if (!$scope.draggingNode && !$scope.draggingParagraph && $scope.draggingProposition) {

          var input = $scope.draggedProposition.text;
        }

        if (prep.lastChar !== '.' && prep.lastChar !== '?' && prep.lastChar !== '!' && prep.lastChar !== ':' && prep.lastChar !== '。') {
          input = input + '.';
        }
        if (paragraph){
          if (paragraph.topAdd || paragraph.bottomAdd || paragraph.leftAdd) {
            apply.textSide = true;
          }
        }
        console.log("To sieve")
        console.log("Input: ", input)
        if (!paragraph){
          paragraph = {
            empty: 'data'
          }
        }


        
        //   Topics

        // If it's ended with a colon, or a dragged node
        // it's a topic

        if ((prep.lastChar === ':' || $scope.draggingNode || $scope.inputs.newSectionTitle) && 
          ($scope.data[0].multiAuthor || $scope.data[0].documentClaimedBy === $scope.userId)) {
          console.log("One")
          prep.code = '1';
          if (prep.lastChar === ':'){
            prep.topic = input.substring(0, input.length - 1);
          } else if ($scope.draggedNode.nodeId){
            prep.topic = $scope.draggedNode.topic;
          } else if ($scope.inputs.newSectionTitle){
            prep.topic = $scope.inputs.newSectionTitle;
          }

          prep.type = 'topic';
          prep.adjustedText = '';
          


          console.log("Automated author? ", automatedAuthor)


          if (!automatedAuthor){
            prep.author = $scope.userId;
          } else {
            prep.author = automatedAuthor;
          }





          if (flag !== 'top'){
            prep.afterNodeId = $scope.selectedNode.nodeId;
          } else if ($scope.selectedNode.sectionNumber === 0){
            prep.beforeNodeId = $scope.selectedNode.nodeId;
          }
          prep.ofNodeId = $scope.selectedNode.nodeId;
          if (flag !== 'top'){
            prep.sectionLevel = ($scope.selectedNode.sectionLevel + 1);
          } else {
            prep.sectionLevel = ($scope.selectedNode.sectionLevel);
          }

          if ($scope.draggingNode && flag === 'top'){
            prep.sectionNumber = node.sectionNumber;
          } else if ($scope.draggingNode) {
            prep.sectionNumber = node.sectionNumber + 1;
          } else {
            prep.sectionNumber = node.sectionNumber + 1;
          }

          prep.id = IdFactory.next();



          

        } else if (paragraph.topAdd || automatedCode === '3D'){
          console.log("3d")
          prep.code = '3D';
          prep.topic = $scope.selectedNode.topic;
          prep.type = 'assertion';
          prep.adjustedText = input;
          prep.author = $scope.userId;
          prep.beforeParagraphId = paragraph.paragraphId;
          prep.targetNodeId = $scope.selectedNode.nodeId;
          prep.sectionNumber = $scope.selectedNode.sectionNumber;
          if (!$scope.hasBeenSetUp){
            $scope.selectedProposition = angular.copy({});
          }
          
          prep.id = IdFactory.next();
          prep.of = {
            type: 'itsown',
            author: 'itsown',
            id: 'itsown',
            text: 'itsown'
          }
          prep.messagesSoFar = [prep.id]

          $scope.inputs['top'+paragraph.paragraphId] = '';

          // document.getElementById('top'+paragraph.paragraphId).innerHTML = '';
        } else if (paragraph.bottomAdd || automatedCode === '3E'){

          console.log("3e")
          prep.code = '3E';
          if (!$scope.hasBeenSetUp){
            $scope.selectedProposition = angular.copy({});
          }
          prep.type = 'assertion';
          prep.adjustedText = input;

          if (!automatedAuthor){
            prep.author = $scope.userId;
            prep.topic = $scope.selectedNode.topic;
            prep.sectionNumber = $scope.selectedNode.sectionNumber;
          } else {
            prep.author = automatedAuthor;
            prep.topic = node.topic;
            prep.sectionNumber = node.sectionNumber;
          }

          if (!$scope.draggingParagraph && !$scope.draggingProposition && !automatedAuthor){
            prep.afterParagraphId = $scope.selectedParagraph.paragraphId;
          } else {
            prep.afterParagraphId = angular.copy(paragraph.paragraphId);
          }
          if (!$scope.draggingParagraph && !$scope.draggingProposition && !automatedAuthor){
            prep.targetNodeId = node.nodeId;
          } else {
            prep.targetNodeId = angular.copy(node.nodeId);
          }
          prep.id = IdFactory.next();
          prep.of = {
            type: 'itsown',
            author: 'itsown',
            id: 'itsown',
            text: 'itsown'
          }
          prep.messagesSoFar = [prep.id]

          paragraph.bottomAdd = false;
        } else if (paragraph.leftAdd || automatedCode === '3F'){
          console.log("3f")
          prep.code = '3F';
          prep.topic = $scope.selectedProposition.topic;
          prep.type = 'assertion';
          prep.adjustedText = input;
          prep.author = $scope.userId;
          prep.targetParagraphId = $scope.selectedParagraph.paragraphId;
          prep.targetNodeId = $scope.selectedNode.nodeId;
          prep.sectionNumber = $scope.selectedNode.sectionNumber;
          prep.beforePropositionId = proposition.id;
          prep.id = IdFactory.next();
          prep.of = {
            type: 'itsown',
            author: 'itsown',
            id: 'itsown',
            text: 'itsown'
          }
          prep.messagesSoFar = [prep.id]
        } else if (
          ($scope.selectedProposition.type === 'assertion' && $scope.data[0].documentClaimedBy !== $scope.userId) ||
                ($scope.selectedProposition.type === 'negation' && $scope.data[0].documentClaimedBy !== $scope.userId && !paragraph.leftAdd) || 
                (automatedCode === '2B' || automatedCode === '2A')
          ) {
          console.log("Input inside negations: ", input)

          // switched sp negation requirements from sp === your username to just not the document author

          // Negations

          // If the selected proposition is not your own
          // and it's a sentence
          // Or if it's a continuation of another remark
          // it's a negation

          if (($scope.selectedProposition.type === 'negation' || (automatedCode === '2B')) && !$scope.hasBeenSetUp) {
            //repeated negation
            console.log("2b")
            prep.code = '2B';
            if (!automatedAuthor){
              prep.topic = $scope.selectedProposition.topic;
            } else {
              prep.topic = node.topic;
            }
            
            prep.type = 'negation';
            prep.adjustedText = input;
            prep.author = $scope.userId;
            if (!automatedAuthor){
              prep.author = $scope.userId;
            } else {
              prep.author = automatedAuthor;
            }

            if (!automatedAuthor){
              prep.afterRemarkId = $scope.selectedProposition.id;
            } else {
              prep.afterRemarkId = $scope.selectedProposition.id;
            }

            if (!automatedAuthor){
              prep.afterPropositionId = $scope.selectedProposition.id;
              prep.targetNodeId = $scope.selectedNode.nodeId;
              prep.targetParagraphId = $scope.selectedParagraph.paragraphId;
              prep.of = {
                type: $scope.selectedProposition.type,
                author: $scope.selectedProposition.author,
                id: $scope.selectedProposition.id,
                text: $scope.selectedProposition.text
              }
              prep.previousMessages = angular.copy($scope.selectedProposition.messagesSoFar);
              prep.id = IdFactory.next();
              prep.previousMessages.push(prep.id)
              prep.messagesSoFar = angular.copy(prep.previousMessages);
            } else {
              prep.afterPropositionId = proposition.id;
              prep.targetNodeId = node.nodeId
              prep.targetParagraphId = paragraph.paragraphId
              prep.of = {
                type: proposition.type,
                author: proposition.author,
                id: proposition.id,
                text: proposition.text
              }
              prep.previousMessages = angular.copy(proposition.messagesSoFar);
              prep.id = IdFactory.next();
              prep.previousMessages.push(prep.id)
              prep.messagesSoFar = angular.copy(prep.previousMessages);
            }
            
            // prep.targetNodeId = $scope.selectedNode.nodeId;
            // prep.targetParagraphId = $scope.selectedParagraph.paragraphId;
            // prep.of = {      
            //   type: $scope.selectedProposition.of.type,
            //   author: $scope.selectedProposition.of.author,
            //   id: $scope.selectedProposition.of.id,
            //   text: $scope.selectedProposition.of.text
            // }
            // prep.previousMessages = angular.copy($scope.selectedProposition.messagesSoFar);
            // prep.previousMessages.pop();
            // prep.id = IdFactory.next();
            // prep.previousMessages.push(prep.id)
            // prep.messagesSoFar = angular.copy(prep.previousMessages);


          } else if (automatedCode === '2A'){

            console.log("2a")
            prep.code = '2A';
            
            if (!automatedAuthor){
              prep.topic = $scope.selectedProposition.topic;
            } else {
              prep.topic = node.topic;
            }
            prep.type = 'negation';
            prep.adjustedText = input;
            console.log("Adjusted text: ", prep.adjustedText)
            
            if (!automatedAuthor){
              prep.author = $scope.userId;
            } else {
              prep.author = automatedAuthor;
            }
            console.log("automated author: ", automatedAuthor)
            if (!automatedAuthor){
              prep.afterPropositionId = $scope.selectedProposition.id;
              prep.targetNodeId = $scope.selectedNode.nodeId;
              prep.targetParagraphId = $scope.selectedParagraph.paragraphId;
              prep.of = {
                type: $scope.selectedProposition.type,
                author: $scope.selectedProposition.author,
                id: $scope.selectedProposition.id,
                text: $scope.selectedProposition.text
              }
              prep.previousMessages = angular.copy($scope.selectedProposition.messagesSoFar);
              prep.id = IdFactory.next();
              prep.previousMessages.push(prep.id)
              prep.messagesSoFar = angular.copy(prep.previousMessages);
            } else {
              prep.afterPropositionId = proposition.id;
              prep.targetNodeId = node.nodeId
              prep.targetParagraphId = paragraph.paragraphId
              prep.of = {
                type: proposition.type,
                author: proposition.author,
                id: proposition.id,
                text: proposition.text
              }
              prep.previousMessages = angular.copy(proposition.messagesSoFar);
              prep.id = IdFactory.next();
              prep.previousMessages.push(prep.id)
              prep.messagesSoFar = angular.copy(prep.previousMessages);
            }
            
            
            
          }




        // Rejoinders: gone as standalones




        } else if ($scope.selectedProposition.question) {
          //won't run

        } else if (($scope.selectedProposition.type === 'negation' &&
          !$scope.draggingProposition &&
          !$scope.draggingParagraph) ||
          automatedCode === '3B'){
          console.log("Prepping rejoinder")
          if (!automatedCode){
            prep.previousMessages = angular.copy($scope.selectedProposition.messagesSoFar);
          } else {

            prep.previousMessages = angular.copy(proposition.messagesSoFar);
          }
          
          prep.id = IdFactory.next();
          prep.previousMessages.push(prep.id)
          prep.messagesSoFar = angular.copy(prep.previousMessages);
          prep.isRejoinder = true;

          prep.capacityCount = 0;
          // console.log("Previous messages: ", prep.previousMessages);
          for (var i = 0; i < paragraph.propositions.length; i++){
            for (var j = 0; j < prep.previousMessages.length; j++){
              // console.log("Considering at ",i,", ",j,":", paragraph.propositions[i])
              if (paragraph.propositions[i].type === 'assertion' &&
                paragraph.propositions[i].author === $scope.userId &&
                paragraph.propositions[i].id === prep.previousMessages[j] &&
                !paragraph.propositions[i].hiddenForAll){
                // If it's one of your own rejoinders in the same thread , count it
                // console.log("Adding to capacity count: ", paragraph.propositions[i].text)
                prep.capacityCount++;
              }
            }
          }

          if (prep.capacityCount < 2 && false){
            // console.log("3a")
            // prep.code = '3A';
            // prep.topic = $scope.selectedProposition.topic;
            // prep.type = 'assertion';
            // prep.adjustedText = input;
            // prep.author = $scope.userId;
            
            // if ($scope.hasBeenSetUp){
            //   prep.afterPropositionId = angular.copy(proposition.of.id);
            // } else {
            //   prep.afterPropositionId = angular.copy($scope.selectedProposition.of.id);
            // }
            // console.log("Got after prop id for: ", angular.copy($scope.selectedProposition.of.text))
            // console.log("The proposition: ", angular.copy(proposition))
            // prep.targetNodeId = $scope.selectedNode.nodeId;
            // prep.targetParagraphId = $scope.selectedParagraph.paragraphId;
            // if (!automatedCode){
            //   prep.rejoins = $scope.selectedProposition.id;
            // } else {
            //   prep.rejoins = onRemarkId;
            //   console.log("On the onRemarkId: ", onRemarkId)
            // }
            
            // prep.of = {
            //   type: $scope.selectedProposition.type,
            //   author: $scope.selectedProposition.author,
            //   id: $scope.selectedProposition.id,
            //   text: $scope.selectedProposition.text
            // }
          } else {
            // repeated rejoinders
            console.log("3b")
            prep.code = '3B';
            prep.topic = $scope.selectedProposition.topic;
            prep.type = 'assertion';
            prep.adjustedText = input;
            if (automatedAuthor){
              prep.author = automatedAuthor;
            } else {
              prep.author = $scope.userId;
            }
            
            if (automatedCode !== '3B'){
              prep.afterPropositionId = angular.copy($scope.selectedProposition.of.id);
            } else {
              for (var i = 0; i < proposition.remarks.length; i++){
                if (proposition.remarks[i].id === onRemarkId){
                  prep.afterPropositionId = proposition.remarks[i].of.id;
                }
              }
              
            }
            console.log("Is there an automated code or not: ", automatedCode)
            console.log("Is there an AUTHOR NUMBER or not: ", authorNumber)
            if ($scope.hasBeenSetUp && !automatedCode){
              if ($scope.selectedProposition.type === 'negation'){
                console.log('A')
                if (proposition) {
                  prep.afterPropositionId = angular.copy(proposition.id);
                } else {
                  prep.afterPropositionId = angular.copy($scope.selectedProposition.of.id);
                }
                console.log("Got after prop id : ", angular.copy($scope.selectedProposition.of.text))
                console.log("SP for A A A: ", angular.copy($scope.selectedProposition.text))
                console.log("The proposition: ", angular.copy(proposition))
              } else {
                console.log("B")
                prep.afterPropositionId = angular.copy($scope.selectedProposition.of.id);
                console.log("Got after prop id for B B B : ", angular.copy($scope.selectedProposition.of.text))
                console.log("The proposition: ", angular.copy(proposition))
              }
              
            } else if (!automatedCode){
              prep.afterPropositionId = angular.copy($scope.selectedProposition.of.id);
              console.log("Got after prop id for C C C : ", angular.copy($scope.selectedProposition.of.text))
              console.log("The proposition: ", angular.copy(proposition))
            } else {

            }
            if ($scope.hasBeenSetUp){
              if (!node){
                prep.targetNodeId = $scope.selectedNode.nodeId;
              } else {
                prep.targetNodeId = node.nodeId;
              }
              
            } else {
              prep.targetNodeId = $scope.selectedNode.nodeId;
            }


            if (($scope.selectedProposition.dialogueSide || !$scope.selectedProposition.textSide) && !automatedCode){
              console.log("Eins")
              prep.afterParagraphId = $scope.selectedParagraph.paragraphId;
            } else if (rejoinderMessaged){
              console.log("zwei")
              prep.afterParagraphId = paragraph.paragraphId;
            } else {
              console.log("drei")
              prep.targetParagraphId = paragraph.paragraphId;
            }


            

            // NEED TO MAKE THE .REJOINS ACCURATE FOR AUTOMATED 3Bs
            // need it to access the remark it is being written on and set the rejoins to its id

            
            if (!automatedCode){
              prep.rejoins = $scope.selectedProposition.id;
            } else {
              prep.rejoins = onRemarkId;
              console.log("On the onRemarkId: ", onRemarkId)
            }



            prep.of = {
              type: $scope.selectedProposition.type,
              author: $scope.selectedProposition.author,
              id: $scope.selectedProposition.id,
              text: $scope.selectedProposition.text
            }



            prep.sectionNumber = $scope.selectedNode.sectionNumber;
            prep.id = IdFactory.next();
            if (!automatedCode){
              prep.messagesSoFar = [$scope.selectedProposition.of.id, $scope.selectedProposition.id, prep.id]
            } else {
              prep.messagesSoFar = [proposition.id, onRemarkId, prep.id]
            }
            
          }
        } else if ($scope.newProp){
          console.log("3c")
          prep.code = '3C';
          prep.newProp = true;
          prep.topic = $scope.selectedProposition.topic;
          prep.type = 'assertion';
          prep.adjustedText = input;
          prep.author = $scope.userId;
          prep.targetNodeId = $scope.selectedNode.nodeId;
          prep.targetSectionNumber = $scope.selectedNode.sectionNumber;
          for (var i = ($scope.data[0].nodes[prep.targetSectionNumber].paragraphs.length -1); i > -1; i--){
            if (!$scope.data[0].nodes[prep.targetSectionNumber].paragraphs[i].hiddenForAll){
              prep.afterParagraphId = $scope.data[0].nodes[prep.targetSectionNumber].paragraphs[i];
              break;
            }
          }
          prep.of = {
            type: $scope.selectedProposition.of.type,
            author: $scope.selectedProposition.of.author,
            id: $scope.selectedProposition.of.id,
            text: $scope.selectedProposition.of.type
          }

          prep.id = IdFactory.next();
          prep.messagesSoFar = [prep.id]

        } else if (
          ($scope.selectedProposition.type === 'assertion' && $scope.userId === node.sectionClaimedBy) && 
          (!$scope.draggingParagraph || proposition.type !== 'blank') && 
          ($scope.draggedProposition.id || $scope.selectedProposition.type !== 'blank') || 
          automatedCode === '3G'
          ){
          console.log("3g")
          console.log("Oh right and that automated author: ", automatedAuthor)
          prep.code = '3G';
          prep.topic = $scope.selectedProposition ? $scope.selectedProposition.topic : proposition.topic;
          prep.type = 'assertion';
          prep.adjustedText = input;
          prep.author = !automatedCode ? $scope.userId : automatedAuthor;
          prep.targetParagraphId = paragraph.paragraphId;
          if (!automatedAuthor && $scope.selectedNode){
            console.log("First 3g")
            prep.targetNodeId = $scope.selectedNode.nodeId;
            prep.sectionNumber = $scope.selectedNode.sectionNumber;
            prep.topic = $scope.selectedProposition.topic;
          } else {
            console.log("Second 3g")
            console.log("Node topic: ", node.topic)
            prep.targetNodeId = node.nodeId;
            prep.sectionNumber = node.sectionNumber;
            prep.topic = proposition.topic;
          } 

          
          // prep.targetNodeId = $scope.selectedNode ? $scope.selectedNode.nodeId : node.nodeId;
          // prep.sectionNumber = $scope.selectedNode ? $scope.selectedNode.nodeId : node.sectionNumber;
          if (($scope.draggingProposition || $scope.draggingParagraph) && !automatedAuthor){
            console.log("un")
            prep.afterPropositionId = proposition.id;
          } else if (!automatedAuthor){
            console.log("deux")
            prep.afterPropositionId = $scope.selectedProposition.id;
          } else {
            console.log("trois")
            console.log("prop text: ", proposition.text)
            prep.afterPropositionId = proposition.id;
          }

          prep.id = IdFactory.next();
          prep.of = {
            type: 'itsown',
            author: 'itsown',
            id: 'itsown',
            text: 'itsown'
          }
          prep.messagesSoFar = [prep.id]
          

        } else if (($scope.selectedProposition.type === 'blank' && !automatedAuthor) || (automatedAuthor && automatedCode === '4')){
          console.log("4")
          prep.code = '4';
          prep.topic = $scope.selectedProposition.topic;
          prep.type = 'assertion';
          prep.adjustedText = input;
          
          if (!automatedAuthor){
            prep.author = $scope.userId;
          } else {
            prep.author = automatedAuthor;
          }
          
          if ($scope.draggingProposition || $scope.draggingParagraph || $scope.hasBeenSetUp){
            prep.targetNodeId = node.nodeId;
          } else {
            prep.targetNodeId = $scope.selectedNode.nodeId;
          }
          prep.sectionNumber = $scope.selectedNode.sectionNumber;
          if ($scope.draggingProposition || $scope.draggingParagraph || automatedCode){
            prep.afterParagraphId = angular.copy(paragraph.paragraphId);
          } else {
            prep.afterParagraphId = $scope.selectedParagraph.paragraphId;
          }
          prep.id = IdFactory.next();
          prep.of = {
            type: 'itsown',
            author: 'itsown',
            id: 'itsown',
            text: 'itsown'
          }
          prep.messagesSoFar = [prep.id]


        } else {

          console.log("womp womp")
          return;
        }
        
        if (prep.code === '3E' && $scope.draggingProposition){
          console.log("Special adjustment")
          prep.savedParagraphId = angular.copy(paragraph.paragraphId);
        }
        console.log("That adjusted text: ", prep.adjustedText)

        prep.adjustedText = prep.adjustedText.replace(/&nbsp;/g, ' ');
        prep.adjustedText = angular.copy(prep.adjustedText).replace(/(&lt;br&gt;&lt;br&gt;\.|<br><br>\.)/g, '');

        if (!$scope.data[0].documentClaimedBy){
          prep.documentClaimedBy = $scope.userId;
          // $scope.data[0].editors = [$scope.userId]
        }

        // var itsFound = false;
        // for (var i = 0; i < $scope.data[0].editors.length; i++){
          
        //   if ($scope.data[0].editors[i] === $scope.userId) {
        //     itsFound = true;
        //   }
        // }

        // if (!itsFound){
        //   $scope.data[0].editors.push($scope.userId)
        //   itsFound = false;
        // }

        

        prep.payload = {
          authorNumber: (authorNumber || authorNumber == 0) ? authorNumber : (event.authorNumber || event.authorNumber == 0) ? event.authorNumber : undefined,
          author: prep.author ? prep.author : $scope.userId,
          text: prep.adjustedText,
          dialogueText: angular.copy(prep.adjustedText),
          type: prep.type,
          code: prep.code,
          topic: prep.topic,
          dialogueSide: $scope.selectedProposition.dialogueSide ? $scope.selectedProposition.dialogueSide : undefined,
          ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
          ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
          of: (prep.of ? prep.of : undefined),
          previousRemarks: prep.previousRemarks ? prep.previousRemarks: undefined,
          blankId: IdFactory.next(),
          textSide: $scope.selectedProposition.textSide ? $scope.selectedProposition.textSide : prep.textSide,
          bookId: $scope.bookId,
          nodeId: IdFactory.next(),
          paragraphId: IdFactory.next(),
          id: prep.id ? prep.id : IdFactory.next(),
          remarkId: IdFactory.next(),
          question: (prep.question ? prep.question : undefined),
          dropflag: $scope.draggedProposition.id ? true : undefined,
          draggedNode: $scope.draggedNode ? $scope.draggedNode : undefined,
          draggedProps: ($scope.draggingNode || $scope.draggingParagraph || $scope.draggingProposition) ?
            $scope.draggedProps : undefined,
          beforeNodeId: prep.beforeNodeId ? prep.beforeNodeId : undefined,
          afterNodeId: prep.afterNodeId ? prep.afterNodeId : undefined,
          replacesNodeId: prep.replacesNodeId ? prep.replacesNodeId : undefined,
          targetNodeId: prep.targetNodeId ? prep.targetNodeId : undefined,
          beforeParagraphId: prep.beforeParagraphId ? prep.beforeParagraphId : undefined,
          afterParagraphId: prep.savedParagraphId ? prep.savedParagraphId : prep.afterParagraphId ? prep.afterParagraphId : undefined,
          targetParagraphId: prep.targetParagraphId ? prep.targetParagraphId : undefined,
          beforePropositionId: prep.beforePropositionId ? prep.beforePropositionId : undefined,
          afterPropositionId: prep.afterPropositionId ? prep.afterPropositionId : undefined,
          beforeRemarkId: prep.beforeRemarkId ? prep.beforeRemarkId : undefined,
          afterRemarkId: prep.afterRemarkId ? prep.afterRemarkId : undefined,
          answeredQuestion: (prep.answeredQuestion ? prep.answeredQuestion : undefined),
          isAntecedent: (prep.isAntecedent ? prep.isAntecedent : undefined),
          isConsequent: (prep.isConsequent ? prep.isConsequent : undefined),
          sectionLevel: (prep.sectionLevel ? prep.sectionLevel : undefined),
          sectionNumber: (prep.sectionNumber ? prep.sectionNumber : undefined),
          documentClaimedBy: (prep.documentClaimedBy ? prep.documentClaimedBy : undefined),
          previousMessages: (prep.previousMessages ? prep.previousMessages : undefined),
          messagesSoFar: (prep.messagesSoFar ? prep.messagesSoFar : undefined),
          rejoins: prep.rejoins ? prep.rejoins : undefined,
          isRejoinder : prep.isRejoinder ? prep.isRejoinder : undefined
          // class: (prep.newClass ? prep.newClass : prep.class),
          // nodePath: (prep.nodePath ? prep.nodePath : undefined),
          // oldNodePath: (prep.oldNodePath ? prep.oldNodePath : undefined),
          // selectedParagraphId: $scope.selectedParagraph.paragraphId,
          // address: prep.address,
          // nodePath: (prep.nodePath ? prep.nodePath : undefined),
          // getsOwnNode: (prep.getsOwnNode === true ? prep.getsOwnNode : undefined),
          // getsOwnParagraph: (prep.getsOwnParagraph === true ? prep.getsOwnParagraph : undefined),
          // newProp: (prep.newProp === true ? prep.newProp : undefined),
          // insertsAbove: (prep.insertsAbove === true ? prep.insertsAbove : undefined),
          // insertsBelow: (prep.insertsBelow === true ? prep.insertsBelow : undefined),
          // insertsLeft: (prep.insertsLeft === true ? prep.insertsLeft : undefined),
          // assertionPath: (prep.assertionPath ? prep.assertionPath : undefined),
          // assertionId: (prep.assertionId ? prep.assertionId : undefined),
          // remarkAddress: (prep.remarkAddress ? prep.remarkAddress : undefined),
          // remarkPath: (prep.remarkPath ? prep.remarkPath : undefined),
          // address: prep.address,
          // paragraphPosition: prep.paragraphPosition,
          // ofParagraphPosition: (prep.ofParagraphPosition !== undefined ? prep.ofParagraphPosition : undefined),
          // isPlaceholder: (prep.isPlaceholder ? prep.isPlaceholder : undefined),
          // propositionToSetLaterPosition: propositionToSetLaterPosition !== undefined ? propositionToSetLaterPosition : undefined,
        };

        

        $scope.tempStopEditable = false;

        console.log("Payload: ", prep.payload)
        // console.log("Socket: ", socketService)
        // socketService.connect();

        $scope.statementHighlightIs = '';

        //      CLEARS THINGS AND EMITS THE PAYLOAD
        chatSocket.emit('proposition', $scope.userId, prep.payload, $scope.bookId);

        // when its a rejoinder
        // when there's no dragged proposition
        // when recycleRemarks is true
        if (prep.payload.type === 'negation' &&
          prep.payload.author === $scope.userId &&
          $scope.recycleRemarks &&
          !$scope.draggedProposition.id &&
          $scope.snowballSurvivesHell){
          prep.nodeDestination = eval(prep.nodePath)
          prep.remarkPayload = {};

          for (var i = 0; i < prep.nodeDestination.paragraphs.length; i++) {

            if (prep.nodeDestination.paragraphs[i].owner === $scope.userId) {

              for (var j = i + 1; j < prep.nodeDestination.paragraphs.length; j++) {

                if (prep.nodeDestination.paragraphs[j]) {
                  if (prep.nodeDestination.paragraphs[j].owner !== $scope.userId && !prep.insertsBelow) {

                    prep.remarkPayload.paragraphPosition = j;
                    prep.remarkPayload.position = 0;
                    break;
                  }


                } else {
                  prep.remarkPayload.paragraphPosition = i;
                  prep.remarkPayload.position = 0;
                  prep.remarkPayload.insertsBelow = true;
                  break;
                }
              }
            }
          }

          prep.remarkPayload = {
                    topic: prep.topic,
                    address: prep.address,
                    paragraphPosition: prep.remarkPayload.position,
                    // ofParagraphPosition: (prep.ofParagraphPosition !== undefined ? prep.ofParagraphPosition : undefined),
                    blankId: IdFactory.next(),
                    textSide: $scope.selectedProposition.textSide ? $scope.selectedProposition.textSide : apply.textSide,
                    dialogueSide: $scope.selectedProposition.dialogueSide ? $scope.selectedProposition.dialogueSide : apply.dialogueSide,
                    class: (prep.newClass ? prep.newClass : prep.class),
                    nodePath: (prep.nodePath ? prep.nodePath : undefined),
                    nodeId: IdFactory.next(),
                    oldNodePath: (prep.oldNodePath ? prep.oldNodePath : undefined),                          //    COMPOSITION OF THE PAYLOAD
                    question: (prep.question ? prep.question : undefined),
                    paragraphId: IdFactory.next(),
                    selectedParagraphId: $scope.selectedParagraph.paragraphId,
                    bookId: $scope.bookId,
                    dropflag: $scope.draggedProposition.id ? true : undefined,
                    // draggedProps: draggedProps ? draggedProps : undefined,
                    proposition: {
                      id: IdFactory.next(),
                      address: prep.address,
                      nodePath: (prep.nodePath ? prep.nodePath : undefined),
                      question: (prep.question ? prep.question : undefined),
                      answeredQuestion: (prep.answeredQuestion ? prep.answeredQuestion : undefined),
                      getsOwnNode: (prep.getsOwnNode === true ? prep.getsOwnNode : undefined),
                      getsOwnParagraph: (prep.getsOwnParagraph === true ? prep.getsOwnParagraph : undefined),
                      newProp: true,
                      insertsAbove: (prep.insertsAbove === true ? prep.insertsAbove : undefined),
                      insertsBelow: (prep.remarkPayload.insertsBelow === true ? prep.remarkPayload.insertsBelow : undefined),
                      insertsLeft: (prep.insertsLeft === true ? prep.insertsLeft : undefined),
                      assertionPath: (prep.assertionPath ? prep.assertionPath : undefined),
                      assertionId: IdFactory.next(),
                      remarkAddress: undefined,
                      remarkPath: undefined,
                      isAntecedent: (prep.isAntecedent ? prep.isAntecedent : undefined),
                      isConsequent: (prep.isConsequent ? prep.isConsequent : undefined),
                      isPlaceholder: (prep.isPlaceholder ? prep.isPlaceholder : undefined),
                      propositionToSetLaterPosition: propositionToSetLaterPosition !== undefined ? propositionToSetLaterPosition : undefined,
                      author: angular.copy(prep.of.author),
                      text: angular.copy(prep.of.text),
                      dialogueText: angular.copy(prep.of.text),
                      // above needs to be fixed for text that changes
                      type: 'assertion',
                      of: undefined,
                      position: prep.remarkPayload.position,
                      remarks: []

                    }
                  };

          chatSocket.emit('proposition', $scope.userId, prep.remarkPayload, $scope.bookId);
        }

        
        if ($scope.hasBeenSetUp && prep.payload.author === $scope.userId && prep.payload.type === 'topic'){
          document.getElementById(proposition.id).innerHTML = '';
        }

        prep = {};


        if (paragraph) {

          $timeout(function () {
            $scope.$apply(function () {
              paragraph.topAdd = false;
              paragraph.bottomAdd = false;
              paragraph.leftAdd = false;
              paragraph.leftMouseOver = false;
              paragraph.topMouseOver = false;
              paragraph.bottomAdd = false;
              paragraph.bottomMouseOver = false;
              // if (node.bottomNodeAdd){
              //
              // }
              if (node){
                node.topNodeAdd = false;
                node.topDropzoneMouseOver= false;
                node.bottomNodeAdd = false;
                node.bottomDropzoneMouseOver = false;
              }
            }, 0);
          });

          


        }


        $scope.hasTopFocus = '';
        $scope.hasBottomFocus = {};
        $scope.hasTopNodeFocus = '';
        $scope.hasBottomNodeFocus = '';
        $scope.hasLeftFocus = {};
        // $scope.hasRightFocus = {};
        $scope.newProp = '';
        $scope.threadAdding = '';
        $scope.draggedProps = [];
        $scope.inputs.newSectionTitle = '';
        $scope.dragStrings = [];
        $scope.dragProps = [];

        $scope.inputs.leftProposition = '';
        if (paragraph){
          $scope.inputs['bottom'+ paragraph.paragraphId] = '';
          $scope.inputs['top'+ paragraph.paragraphId] = '';
        }
        
        if (document.getElementById('left' + $scope.selectedProposition.id)){
          console.log("Clearing with innerHTML")
          document.getElementById('left' + $scope.selectedProposition.id).innerHTML = '';
        }


        if (proposition){
          console.log("What was that sp: ", angular.copy(proposition.id))
        }
        



        
        

      };

      $scope.$on('socket:broadcastDeletion', function (event, payload) {


        $timeout(function () {
          $scope.$apply(function () {
            $scope.propToDeleteAnimate.id = payload.id;
          }, 0);
        });

      });

      $scope.$on('socket:broadcastProposition', function (event, payload) {


        console.log("Received proposition: ", payload)

        if (payload.author === $scope.userId && $scope.inputs.leftProposition) {
          console.log("Right up front")
          $scope.inputs.leftProposition = '';

        }
        
        if ($scope.data[0].muteds.includes(payload.author)){
          console.log("Payload muting")
          payload.muted = true;
        }

        if (!$scope.data[0].moveCounter){
          $scope.data[0].moveCounter = 0;
        }
        $scope.data[0].moveCounter++;

        if (payload.bookId !== $scope.bookId) {
          console.log("Returning for book mismatch")
          return;
        }

        $timeout(function () {
          $scope.$apply(function () {
            console.log("Inside the apply")



            payload.color = $scope.calcColors(angular.copy(payload));

            // Since n users are connected, does it save to the database n times?
            if (payload.documentClaimedBy){
              $scope.data[0].documentClaimedBy = payload.documentClaimedBy;
            }

            if (payload.dropflag) {
              $scope.inputs.nothing;
            }
            if (payload.author !== $scope.userId){
              $scope.propToAddAnimate.id = payload.id;
            } else if (payload.type == 'rejoinder'){
              $scope.propToRejoinAnimate.id = payload.id;
            }


            apply = {};
            if (payload.author === $scope.userId && payload.code !== '3D' && payload.code !== '3E') {
              console.log("Should be clearing an input")
              console.log("That payload id: ", payload.id)
              console.log("That payload text: ", payload.text)
              $scope.inputs = {};
              if ($scope.selectedProposition.id){
                if (document.getElementById($scope.selectedProposition.id)){
                  if (!document.getElementById($scope.selectedProposition.id).classList.contains('thread')) {
                    document.getElementById($scope.selectedProposition.id).innerHTML = '';
                  } else {
                    // Do something else if the element doesn't have the class
                  }
                }
                
                
              }
              
            }

            if (payload.code === '1') {

              if (!payload.beforeNodeId){
                for (var i = 0; i < $scope.data[0].nodes.length; i++){
                  if ($scope.data[0].nodes[i].nodeId === payload.ofNodeId){
                    apply.parentNode = $scope.data[0].nodes[i];
                    apply.parentNodeIndex = angular.copy(i);
                    break;
                  }
                }

                if ($scope.data[0].nodes[apply.parentNodeIndex + 1]){
                  // if theres one after
                  for (var i = $scope.data[0].nodes.length-1; i > apply.parentNodeIndex; i--){
                    $scope.data[0].nodes[i + 1] =  angular.copy($scope.data[0].nodes[i]);
                    $scope.data[0].nodes[i + 1].sectionNumber++;
                  }
                  if (!payload.draggedNode.nodeId){
                    $scope.data[0].nodes[apply.parentNodeIndex+1] = {
                      topic: payload.topic,
                      dateCreated: Date(),
                      lastModified: null,
                      nodeId: payload.nodeId,
                      minimized: false,
                      sectionLevel: payload.sectionLevel,
                      sectionNumber: payload.sectionNumber,
                      sectionClaimedBy: payload.author,
                      paragraphs: [
                        {
                          first: true,
                          paragraphId: payload.paragraphId,
                          theBlankParagraph: true,
                          propositions: [
                            {
                              id: payload.id,
                              type: 'blank',
                              author: '',
                              text: '',
                              remarks: [],
                              dialogueSide: false,
                              first: true,
                              messagesSoFar: payload.messagesSoFar,
                            }
                          ]
                        }
                      ],
                    }
                  } else {
                    $scope.data[0].nodes[apply.parentNodeIndex+1] = angular.copy(payload.draggedNode);
                    $scope.data[0].nodes[apply.parentNodeIndex+1].sectionNumber = (apply.parentNodeIndex+1);
                    $scope.data[0].nodes[apply.parentNodeIndex+1].sectionClaimedBy = payload.author;

                  }

                } else {
                    $scope.data[0].nodes[apply.parentNodeIndex + 1] = {
                      topic: payload.topic,
                      dateCreated: Date(),
                      lastModified: null,
                      nodeId: payload.nodeId,
                      minimized: false,
                      sectionLevel: payload.sectionLevel,
                      sectionNumber: payload.sectionNumber,
                      sectionClaimedBy: payload.author,
                      paragraphs: [
                        {
                          first: true,
                          paragraphId: payload.paragraphId,
                          theBlankParagraph: true,
                          propositions: [
                            {
                              id: payload.id,
                              type: 'blank',
                              author: '',
                              text: '',
                              remarks: [],
                              dialogueSide: false,
                              first: true,
                              messagesSoFar: payload.messagesSoFar,
                            }
                          ]
                        }
                      ],
                    }
                }
                
                console.log("Payload author: ", payload.author)
                if (!payload.draggedNode.nodeId && payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide){
                    setTimeout(function () {
                      console.log("FIRSTY")
                      document.getElementById('proposition' + payload.id).click();
                  }, 20);
                }


              } else {
                for (var i = 0; i < $scope.data[0].nodes.length; i++){
                  if ($scope.data[0].nodes[i].nodeId === payload.ofNodeId){
                    apply.parentNode = $scope.data[0].nodes[i];
                    apply.parentNodeIndex = angular.copy(i);
                    break;
                  }
                }

                if ($scope.data[0].nodes[apply.parentNodeIndex - 1]){
                  for (var i = $scope.data[0].nodes.length-1; i > apply.parentNodeIndex-1; i--){
                    $scope.data[0].nodes[i + 1] =  angular.copy($scope.data[0].nodes[i]);
                    $scope.data[0].nodes[i + 1].sectionNumber++;
                  }
                  if (!payload.draggedNode){
                    $scope.data[0].nodes[apply.parentNodeIndex] = {
                      topic: payload.topic,
                      dateCreated: Date(),
                      lastModified: null,
                      nodeId: payload.nodeId,
                      minimized: false,
                      sectionLevel: payload.sectionLevel,
                      sectionNumber: payload.sectionNumber,
                      sectionClaimedBy: payload.author,
                      paragraphs: [
                        {
                          first: true,
                          paragraphId: payload.paragraphId,
                          theBlankParagraph: true,
                          propositions: [
                            {
                              id: payload.id,
                              type: 'blank',
                              author: '',
                              text: '',
                              remarks: [],
                              dialogueSide: false,
                              first: true,
                              messagesSoFar: payload.messagesSoFar, 
                            }
                          ]
                        }
                      ],
                    }
                  } else {
                    $scope.data[0].nodes[apply.parentNodeIndex] = payload.draggedNode;
                    $scope.data[0].nodes[apply.parentNodeIndex].sectionClaimedBy = payload.author;
                  }

                } else {
                  // if there is one before
                  for (var i = (apply.parentNodeIndex); i < $scope.data[0].nodes.length; i++){
                    $scope.data[0].nodes[i + 1] =  $scope.data[0].nodes[i];
                  }
                  if (!payload.draggedNode){
                    $scope.data[0].nodes[apply.parentNodeIndex] = {
                      topic: payload.topic,
                      dateCreated: Date(),
                      lastModified: null,
                      nodeId: payload.nodeId,
                      minimized: false,
                      sectionClaimedBy: payload.author,
                      paragraphs: [
                        {
                          first: true,
                          paragraphId: payload.paragraphId,
                          theBlankParagraph: true,
                          propositions: [
                            {
                              id: payload.id,
                              type: 'blank',
                              author: '',
                              text: '',
                              remarks: [],
                              dialogueSide: false,
                              first: true,
                              messagesSoFar: payload.messagesSoFar,
                            }
                          ]
                        }
                      ],
                    }
                  } else {
                    $scope.data[0].nodes[apply.parentNodeIndex] = payload.draggedNode;
                    $scope.data[0].nodes[apply.parentNodeIndex].sectionClaimedBy = payload.author;
                  }

                }

                if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide){
                  console.log("SECONDY")
                  setTimeout(function () {
                      document.getElementById('proposition' + payload.id).click();
                  }, 20);
                }

              }



              if ($scope.selectedNode.sectionNumber){
                // correct selecteds
              }


            } else if (payload.code === '2B'){
              console.log("2b")
              for (var i = 0; i < $scope.data[0].nodes.length; i++){
                console.log('2b i: ', angular.copy(i))
                for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
                  console.log('2b j: ', angular.copy(j))
                  for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                    console.log('2b k: ', angular.copy(k))
                    for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                      if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].id === payload.of.id){
                        // the of id on the payload is a negation, but the above looks for a proposition
                        apply.nodeTarget = angular.copy(i);
                        apply.paragraphTarget = angular.copy(j);
                        apply.propTarget = angular.copy(k);
                        console.log('2b hit:')
                        break;
                      }
                    }
                  }
                }
              }
              
              $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.propTarget].remarks.unshift(
                {
                  id: payload.id,
                  type: 'negation',
                  author: payload.author,
                  text: payload.text,
                  dialogueSide: false,
                  messagesSoFar: payload.messagesSoFar,
                  previousMessages: payload.previousMessages,
                  of: payload.of,
                  muted: payload.muted ? true : undefined,
                }
              )
              for (var i = 0; i < $scope.data[0].nodes.length; i++){
                for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
                  for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                    for (var l = 0; l < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; l++){
                      if ($scope.selectedProposition.id){
                        if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[l].id === payload.id &&
                          !$scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[l].hiddenForAll &&
                          ($scope.selectedProposition.textSide || !$scope.selectedProposition.dialogueSide)){
                          apply.reselectTarget = angular.copy($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[l].id);
                          console.log("Got a reslect target: ", apply.reselectTarget)
                          break;
                        }
                      }
                    }
                  }
                }
              }


              if (payload.author === $scope.userId && !payload.dialogueSide && !$scope.selectedProposition.id){
                console.log("2B click")
                setTimeout(function () {
                  document.getElementById('proposition' + payload.id).click();
                  document.getElementById(payload.id).style.borderBottomColor = "#0C2340";
                }, 20);
              } else if (apply.reselectTarget){
                console.log("2B Collision click")
                console.log("About to click: ", angular.copy(document.getElementById('proposition' + apply.reselectTarget)))
                var copyThis = angular.copy(apply.reselectTarget);
                console.log("Copy this: ", copyThis)
                setTimeout(function () {
                  document.getElementById('proposition' + copyThis).click();
                  document.getElementById(copyThis).style.borderBottomColor = "#0C2340";
                }, 100);
              }

            } else if (payload.code === '2A'){
              console.log("2a received")

              for (var i = 0; i < $scope.data[0].nodes.length; i++){

                for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){

                  for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                 
                    if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === payload.of.id &&
                      !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll){
                      console.log("GOT YA!")
                      apply.nodeTarget = i;
                      apply.paragraphTarget = j;
                      apply.propTarget = k;
                      break;
                    }
                  }
                }
              }

              //Remarks expanded FALSE
              $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.propTarget].remarksExpanded = false;



              $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.propTarget].remarks.unshift(
                {
                  id: payload.id,
                  type: 'negation',
                  author: payload.author,
                  text: payload.text,
                  dialogueText: payload.dialogueText,
                  dialogueSide: false,
                  messagesSoFar: payload.messagesSoFar,
                  of: payload.of,
                  muted: payload.muted ? true : undefined,
                  

                }
              )

              for (var i = 0; i < $scope.data[0].nodes.length; i++){
                for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
                  for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                    for (var l = 0; l < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; l++){
                      if ($scope.selectedProposition.id){
                        if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[l].id === $scope.selectedProposition.id &&
                          !$scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[l].hiddenForAll &&
                          ($scope.selectedProposition.textSide || !$scope.selectedProposition.dialogueSide)){
                          apply.reselectTarget = angular.copy($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[l].id);
                          console.log("Got a reslect target: ", apply.reselectTarget)
                          break;
                        }
                      }
                    }
                  }
                }
              }

              if (payload.author === $scope.userId && !payload.dialogueSide && !$scope.selectedProposition.id){
                console.log("2A click")
                setTimeout(function () {
                  document.getElementById('proposition' + payload.id).click();
                  document.getElementById(payload.id).style.borderBottomColor = "#0C2340";
                }, 20);
              } else if (apply.reselectTarget){
                console.log("2A Collision click")
                console.log("About to click: ", angular.copy(document.getElementById('proposition' + apply.reselectTarget)))
                var copyThis = angular.copy(apply.reselectTarget);
                console.log("Copy this: ", copyThis)
                setTimeout(function () {
                  document.getElementById('proposition' + copyThis).click();
                }, 100);
              } else if (!$scope.hasBeenSetUp){
                setTimeout(function () {
                  console.log("Else element clicking two ay: ", document.getElementById(payload.of.id))
                  console.log("Value", angular.copy($scope.inputs[payload.of.id]))
                  // document.getElementById(payload.of.id).style.borderBottomColor = "#0C2340";
                }, 40);
                
              }

            } else if (payload.code === '3B'){

              // rejoinder
              console.log("3B Rejoinder")

              for (var i = 0; i < $scope.data[0].nodes.length; i++){
                if ($scope.data[0].nodes[i].nodeId === payload.targetNodeId &&
                  !$scope.data[0].nodes[i].droppedElsewhere){
                  apply.nodeIndex = i;
                  for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
                    if (payload.afterParagraphId){
                      if ($scope.data[0].nodes[i].paragraphs[j].paragraphId === payload.afterParagraphId &&
                        !$scope.data[0].nodes[i].paragraphs[j].hiddenForAll){
                        apply.afterParagraphIndex = j;
                        break;
                      }
                    } else { // it is inline
                      if ($scope.data[0].nodes[i].paragraphs[j].paragraphId === payload.targetParagraphId &&
                        !$scope.data[0].nodes[i].paragraphs[j].hiddenForAll){
                        apply.targetParagraphIndex = j;
                        break;
                      }

                    }         
                  }
                }
              }


              // console.log("The index working with: ", apply.afterParagraphIndex)
              // console.log("The prop index working with: ", payload.afterPropositionId)
              // How does the above deal with hidden or deleted nodes?






              if ($scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1] && apply.afterParagraphIndex){
                
                
                for (var i = $scope.data[0].nodes[apply.nodeIndex].paragraphs.length-1; i > (apply.afterParagraphIndex-1); i--){
                  $scope.data[0].nodes[apply.nodeIndex].paragraphs[i + 1] = angular.copy($scope.data[0].nodes[apply.nodeIndex].paragraphs[i]);
                }
                $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1] = {
                  first: false,
                  paragraphId: payload.paragraphId,
                  propositions: [
                    {
                      id: payload.id,
                      type: 'assertion',
                      author: payload.author,
                      text: payload.text,
                      remarks: [],
                      dialogueSide: false,
                      first: true,
                      messagesSoFar: payload.messagesSoFar,
                    }
                  ]
                }
                for (var i = 0; i < $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex].propositions.length; i++){
                  for (var j = 0; j < $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex].propositions[i].remarks.length; j++){
                    // console.log("3B considering: ", $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex].propositions[i].remarks[j])
                    if (payload.rejoins === $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex].propositions[i].remarks[j].id){
                      $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex].propositions[i].remarks[j].rejoined = true;
                      break;
                    }
                  }

                }
              } else if (apply.afterParagraphIndex){

                
                $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1] = {
                  first: true,
                  paragraphId: payload.paragraphId,
                  propositions: [
                    {
                      id: payload.id,
                      type: 'assertion',
                      author: payload.author,
                      text: payload.text,
                      remarks: [],
                      dialogueSide: false,
                      first: true,
                      messagesSoFar: payload.messagesSoFar,
                    }
                  ]
                }
                for (var i = 0; i < $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex].propositions.length; i++){
                  for (var j = 0; j < $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex].propositions[i].remarks.length; j++){
                    console.log("3B considering: ", $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex].propositions[i].remarks[j])
                    if (payload.rejoins === $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex].propositions[i].remarks[j].id){
                      $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex].propositions[i].remarks[j].rejoined = true;
                      break;
                    }
                  }

                }
              } else {
                // it is placed inline
                console.log("Goes inline")
                for (var i = 0; i < $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.targetParagraphIndex].propositions.length; i++){
                  if ($scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.targetParagraphIndex].propositions[i].id === payload.afterPropositionId){
                    apply.afterPropTarget = angular.copy(i);
                    console.log("After prop target eh: ", apply.afterPropTarget)
                    break;
                  }
                }
                if ($scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.targetParagraphIndex].propositions[apply.afterPropTarget+1]){
                  
                  for (var i = $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.targetParagraphIndex].propositions.length-1; 
                    i > (apply.afterPropTarget); i--){
                    $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.targetParagraphIndex].propositions[i+1] = angular.copy($scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.targetParagraphIndex].propositions[i]);
                  }
                  $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.targetParagraphIndex].propositions[apply.afterPropTarget] = 
                    {
                      id: payload.id,
                      type: 'assertion',
                      author: payload.author,
                      text: payload.text,
                      remarks: [],
                      dialogueSide: false,
                      first: true,
                      messagesSoFar: payload.messagesSoFar,
                    }
                } else {
                  
                  // have to push
                  $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.targetParagraphIndex].propositions.push(
                    {
                      id: payload.id,
                      type: 'assertion',
                      author: payload.author,
                      text: payload.text,
                      remarks: [],
                      dialogueSide: false,
                      first: true,
                      messagesSoFar: payload.messagesSoFar,
                    }
                  )
                }
              for (var i = 0; i < $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.targetParagraphIndex].propositions.length; i++){
                for (var j = 0; j < $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.targetParagraphIndex].propositions[i].remarks.length; j++){
                  console.log("3B considering: ", $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.targetParagraphIndex].propositions[i].remarks[j])
                  
                  if (payload.rejoins === $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.targetParagraphIndex].propositions[i].remarks[j].id){
                    $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.targetParagraphIndex].propositions[i].remarks[j].rejoined = true;
                    break;
                  }
                }

              }
              }

              
              if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide && !$scope.selectedProposition.id){
                setTimeout(function () {
                //   $scope.$apply(function () {
                    document.getElementById('proposition' + payload.id).click();
                //   });
                }, 20);
              }

            } else if (payload.code === '3A'){
              // regular rejoinder
              console.log("3A Rejoinder")

             for (var i = 0; i < $scope.data[0].nodes.length; i++){

               for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){

                 for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                   if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === payload.afterPropositionId &&
                    !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll){
                     apply.nodeTarget = i;
                     apply.paragraphTarget = j;
                     apply.afterPropTarget = k;
                     break;
                   }
                 }
               }
             }

             if ($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.afterPropTarget+1]){

               for (var n = angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions.length-1); n > apply.afterPropTarget; n--){
                 $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+1] =
                 angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n]);
               }
               $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.afterPropTarget+1] = {
                 id: payload.id,
                 type: 'assertion',
                 author: payload.author,
                 text: payload.text,
                 remarks: [],
                 dialogueSide: false,
                 first: true,
                 messagesSoFar: payload.messagesSoFar,
                 isRejoinder: true,
               }
             } else {
               $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.afterPropTarget+1] = {
                 id: payload.id,
                 type: 'assertion',
                 author: payload.author,
                 text: payload.text,
                 remarks: [],
                 dialogueSide: false,
                 first: true,
                 messagesSoFar: payload.messagesSoFar,
                 isRejoinder: true,
               }
             }


             // isn't finding the remark to rejoin somewhere in here

              for (var i = 0; i < $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions.length; i++){
                for (var j = 0; j < $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[i].remarks.length; j++){
                  if (payload.rejoins === $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[i].remarks[j].id){
                    $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[i].remarks[j].rejoined = true;
                    break;
                  }
                }

              }

             if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide){
               setTimeout(function () {
                   document.getElementById('proposition' + payload.id).click();
               }, 20);
             }


            } else if (payload.code === '3F'){

              console.log("3f leftadd received")

              for (var i = 0; i < $scope.data[0].nodes.length; i++){

                for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){

                  for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                    if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === payload.beforePropositionId &&
                      !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll){
                      apply.nodeTarget = angular.copy(i);
                      apply.paragraphTarget = angular.copy(j);
                      apply.beforePropTarget = angular.copy(k);
                      break;
                    }
                  }
                }
              }

              $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.beforePropTarget].preSelected = false;

              if (!payload.draggedProps){
                  for (var n = angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions.length-1); n > apply.beforePropTarget-1; n--){
                    $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+1] =
                    angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n]);
                  }

                  $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.beforePropTarget] = {
                    id: payload.id,
                    type: 'assertion',
                    author: payload.author,
                    text: payload.text,
                    remarks: [],
                    dialogueSide: false,
                    first: true,
                    messagesSoFar: payload.messagesSoFar,
                    preSelected: false,
                  }
                if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide){
                  setTimeout(function () {
                      document.getElementById('proposition' + payload.id).click();
                  }, 20);
                }

              } else {
                  for (var n = angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions.length-1); n > apply.beforePropTarget-1; n--){
                    $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+payload.draggedProps.length] =
                    angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n]);
                  }
                  for (var n = 0; n < payload.draggedProps.length; n++){
                    $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+apply.beforePropTarget] = angular.copy(payload.draggedProps[n]);
                    $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+apply.beforePropTarget].isPresentlyBeingDragged = false;
                    
                  }
              }


            } else if (payload.code === '3D'){

              console.log("3d topadd received")

              for (var i = 0; i < $scope.data[0].nodes.length; i++){
                for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
                  if ($scope.data[0].nodes[i].paragraphs[j].paragraphId === payload.beforeParagraphId &&
                    !$scope.data[0].nodes[i].paragraphs[j].hiddenForAll){
                    apply.nodeTarget = angular.copy(i);
                    apply.beforeParagraphTarget = angular.copy(j);
                    break;
                  }
                }
              }

              for (var k = angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs.length-1); k > (apply.beforeParagraphTarget-1); k--){
                $scope.data[0].nodes[apply.nodeTarget].paragraphs[k+1] = angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[k]);
              }

              if (!payload.draggedProps){
                $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.beforeParagraphTarget] = {};

                $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.beforeParagraphTarget] = angular.copy({
                  first: true,
                  paragraphId: payload.paragraphId,
                  propositions: [
                    {
                      id: payload.id,
                      type: 'assertion',
                      author: payload.author,
                      text: payload.text,
                      remarks: [],
                      dialogueSide: false,
                      first: true,
                      messagesSoFar: payload.messagesSoFar,
                      preSelected: false,
                    }
                  ]
                })

                if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide){
                  setTimeout(function () {
                      document.getElementById('proposition' + payload.id).click();
                  }, 20);
                }
              } else {
                $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.beforeParagraphTarget] = {};

                $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.beforeParagraphTarget] = angular.copy({
                  first: true,
                  paragraphId: payload.paragraphId,
                  propositions: [
                    {
                      id: payload.id,
                      type: 'assertion',
                      author: payload.author,
                      text: payload.text,
                      remarks: [],
                      dialogueSide: false,
                      first: true,
                      messagesSoFar: payload.messagesSoFar,
                      preSelected: false,
                    }
                  ]
                })
                for (var n = 0; n < payload.draggedProps.length; n++){
                  $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.beforeParagraphTarget].propositions[n] = payload.draggedProps[n];
                  $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.beforeParagraphTarget].propositions[n].isPresentlyBeingDragged = false;
              
                }
              }

            } else if (payload.code === '3E'){
              console.log("3e bottomadd received")
              for (var i = 0; i < $scope.data[0].nodes.length; i++){
                if ($scope.data[0].nodes[i].nodeId === payload.targetNodeId){
                  apply.nodeIndex = angular.copy(i);
                  for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
                    if ($scope.data[0].nodes[i].paragraphs[j].paragraphId === payload.afterParagraphId &&
                      !$scope.data[0].nodes[i].paragraphs[j].hiddenForAll){

                      apply.afterParagraphIndex = angular.copy(j);
                      break;
                    }
                  }
                }
              }
              if ($scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1]){
                if (!payload.draggedProps){
                  for (var i = $scope.data[0].nodes[apply.nodeIndex].paragraphs.length-1; i > (apply.afterParagraphIndex-1); i--){
                    $scope.data[0].nodes[apply.nodeIndex].paragraphs[i + 1] = angular.copy($scope.data[0].nodes[apply.nodeIndex].paragraphs[i]);
                  }
                  $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1] = {
                    first: false,
                    paragraphId: payload.paragraphId,
                    propositions: [
                      {
                        id: payload.id,
                        type: 'assertion',
                        author: payload.author,
                        text: payload.text,
                        remarks: [],
                        dialogueSide: false,
                        first: true,
                        messagesSoFar: payload.messagesSoFar,
                        preSelected: false,
                        animate: true
                      }
                    ]
                  }
                  console.log("3E node now: ", angular.copy($scope.data[0].nodes[apply.nodeIndex]))
                  if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide){
                    setTimeout(function () {
                        document.getElementById('proposition' + payload.id).click();
                    }, 20);
                  }
                } else {
                  console.log("Bottomadd with dragprops")
                  for (var i = $scope.data[0].nodes[apply.nodeIndex].paragraphs.length-1; i > (apply.afterParagraphIndex -1); i--){
                    $scope.data[0].nodes[apply.nodeIndex].paragraphs[i + 1] = angular.copy($scope.data[0].nodes[apply.nodeIndex].paragraphs[i]);
                  }
                  $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1] = {
                    first: false,
                    paragraphId: payload.paragraphId,
                    propositions: [

                    ]
                  }
                  for (var n = 0; n < payload.draggedProps.length; n++){
                    $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1].propositions[n] = payload.draggedProps[n];
                    $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1].propositions[n].isPresentlyBeingDragged = false;
                  }
                }

              } else {
                if (!payload.draggedProps){
                  $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1] = {
                    first: true,
                    paragraphId: payload.paragraphId,
                    propositions: [
                      {
                        id: payload.id,
                        type: 'assertion',
                        author: payload.author,
                        text: payload.text,
                        remarks: [],
                        dialogueSide: false,
                        first: true,
                        messagesSoFar: payload.messagesSoFar,
                        preSelected: false,
                        animate: true
                      }
                    ]
                  }
                  console.log("3E node now: ", angular.copy($scope.data[0].nodes[apply.nodeIndex]))
                  if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide){
                    setTimeout(function () {
                        document.getElementById('proposition' + payload.id).click();
                    }, 20);
                  }
                } else {
                  $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1] = {
                    first: true,
                    paragraphId: payload.paragraphId,
                    propositions: [
                    ]
                  }
                  for (var n = 0; n < payload.draggedProps.length; n++){
                    $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1].propositions[n] = payload.draggedProps[n];
                    $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1].propositions[n].hiddenForAll = null;
                    $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1].propositions[n].isPresentlyBeingDragged = false;
              
                  }
                }


              }


            } else if (payload.code === '3G'){
              console.log("It's a 3g pretty normal proposition")

              if (!payload.draggedProps){
                for (var i = 0; i < $scope.data[0].nodes.length; i++){

                  for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){

                    for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                      if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === payload.afterPropositionId &&
                        !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll &&
                        $scope.data[0].nodes[i].paragraphs[j].propositions[k][$scope.userId] !== 'hidden'){
                        apply.nodeTarget = angular.copy(i);
                        apply.paragraphTarget = angular.copy(j);
                        apply.afterPropTarget = angular.copy(k);
                        break;
                      }
                    }
                  }
                }

                $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.afterPropTarget].preSelected = false;

                if ($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.afterPropTarget+1]){
                  for (var n = $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions.length-1; n > apply.afterPropTarget; n--){
                    $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+1] =
                    angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n]);

                  }
                  $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.afterPropTarget+1] = {
                    id: payload.id,
                    type: 'assertion',
                    author: payload.author,
                    text: payload.text,
                    remarks: [],
                    dialogueSide: false,
                    first: true,
                    messagesSoFar: payload.messagesSoFar,
                    preSelected: false,
                    animate: true
                  }
                } else {
                  $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.afterPropTarget+1] = {
                    id: payload.id,
                    type: 'assertion',
                    author: payload.author,
                    text: payload.text,
                    remarks: [],
                    dialogueSide: false,
                    first: true,
                    messagesSoFar: payload.messagesSoFar,
                    preSelected: false,
                    animate: true
                  }
                }

                if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide &&
                  !payload.draggedProps){
                  setTimeout(function () {
                      document.getElementById('proposition' + payload.id).click();
                  }, 20);
                }
              } else {
                for (var i = 0; i < $scope.data[0].nodes.length; i++){
                  console.log("Is")
                  for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){

                    console.log("Js")
                    for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
                      console.log("Ks")
                      if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === payload.afterPropositionId &&
                        !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll &&
                        $scope.data[0].nodes[i].paragraphs[j].propositions[k][$scope.userId] !== 'hidden'){
                        console.log("If")
                        apply.nodeTarget = angular.copy(i);
                        apply.paragraphTarget = angular.copy(j);
                        apply.afterPropTarget = angular.copy(k);
                        break;
                      }
                    }
                  }
                }

                if ($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.afterPropTarget+1]){

                    for (var n = $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions.length-1; n > apply.afterPropTarget; n--){

                      $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+payload.draggedProps.length] =
                      angular.copy($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n]);
                     
                    }
                    for (var n = 0; n < payload.draggedProps.length; n++){

                      $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+apply.afterPropTarget+1] = payload.draggedProps[n];
                      $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+apply.afterPropTarget+1].isPresentlyBeingDragged = false;

                    }

                  if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide && !payload.draggedProps){
                    setTimeout(function () {

                      document.getElementById('proposition' + payload.id).click();
                    }, 20);
                  }
                } else {
                    for (var n = 0; n < payload.draggedProps.length; n++){
                      $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+apply.afterPropTarget+1] = payload.draggedProps[n];
                      $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[n+apply.afterPropTarget+1].isPresentlyBeingDragged = false;
                    }

                  if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide && !payload.draggedProps){
                    setTimeout(function () {
                      document.getElementById('proposition' + payload.id).click();
                    }, 20);
                  }
                }
              }



            } else if (payload.code === '4') {
              console.log("replaces blank")
              for (var i = 0; i < $scope.data[0].nodes.length; i++){
                if ($scope.data[0].nodes[i].nodeId === payload.targetNodeId){
                  apply.nodeIndex = i;
                  console.log("Target node index: ", apply.nodeIndex)
                  for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
                    if ($scope.data[0].nodes[i].paragraphs[j].paragraphId === payload.afterParagraphId){
                      apply.afterParagraphIndex = j;
                      console.log("Got paragraph index which is j: ", apply.afterParagraphIndex)
                      $scope.data[0].nodes[i].paragraphs[j].first = false;
                      $scope.data[0].nodes[i].paragraphs[j].hiddenForAll = true;
                      for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){

                        $scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll = true;
                        $scope.data[0].nodes[i].paragraphs[j].propositions[k].first = false;
                        if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks){
                          for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                            $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].hiddenForAll = true;
                          }
                        }
                      }
                      break;
                    }
                  }
                }
              }



              if (!payload.draggedProps){
                  $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1] = {
                  first: true,
                  paragraphId: payload.paragraphId,
                  propositions: [
                    {
                      id: payload.id,
                      type: 'assertion',
                      author: payload.author,
                      text: payload.text,
                      remarks: [],
                      dialogueSide: false,
                      first: true,
                      messagesSoFar: payload.messagesSoFar,
                      preSelected: false,
                      animate: true
                    }
                  ]
                }
                if (payload.author === $scope.userId){
                  setTimeout(function () {
                      document.getElementById('proposition' + payload.id).click();
                  }, 20);
                }
                
              } else {
                  $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex + 1] = {
                  first: true,
                  paragraphId: payload.paragraphId,
                  propositions: []
                }
                for (var n = 0; n < payload.draggedProps.length; n++){
                  $scope.data[0].nodes[apply.nodeIndex].paragraphs[apply.afterParagraphIndex+1].propositions[n] = payload.draggedProps[n];
                }
              }
              
            }

            console.log("Outside receive sieve for payload text: ", payload.text)

            $scope.scroll.threadId = IdFactory.next();

            if (payload.author === $scope.userId &&
              payload.textSide &&
              $scope.cowsComeHome == true){

              apply.muteIncomingThread = true;
            }


            //       DIALOGUE PRINTER
            console.log("What's that payload type again: ", angular.copy(payload.type))

            if (payload.type === 'assertion' && !payload.draggedProps){
              
              // var goingToPushThis = {
              //   isMessage: true,
              //   author: payload.author,
              //   text: payload.text,
              //   dialogueText: payload.dialogueText,
              //   type: payload.type,
              //   of: payload.of,
              //   id: payload.id,
              //   previousMessages: payload.previousMessages,
              //   messagesSoFar: payload.messagesSoFar,
              //   color: payload.color,
              //   animate: true
              // }
              
              $scope.data[0].dialogue.push(
              {
                isMessage: true,
                author: payload.author,
                text: payload.text,
                dialogueText: payload.dialogueText,
                type: payload.type,
                of: payload.of,
                id: payload.id,
                previousMessages: payload.previousMessages,
                messagesSoFar: payload.messagesSoFar,
                color: payload.color,
                animate: true
              })
              
            } else if (payload.type === 'negation'){
              
             
              console.log($scope.data[0].dialogue[$scope.data[0].dialogue.length-1].of.id === payload.of.id)
                console.log($scope.data[0].dialogue[$scope.data[0].dialogue.length-1].type === 'negation')
              if ($scope.data[0].dialogue[$scope.data[0].dialogue.length-1].id === payload.of.id ||
                ($scope.data[0].dialogue[$scope.data[0].dialogue.length-1].of.id === payload.of.id ||
                $scope.data[0].dialogue[$scope.data[0].dialogue.length-1].type === 'negation') ||
                true){
                // if it's responding to the last one, just push it
                $scope.data[0].dialogue.push(
                {
                  isMessage: true,
                  author: payload.author,
                  text: payload.text,
                  dialogueText: payload.dialogueText,
                  type: payload.type,
                  of: payload.of,
                  id: payload.id,
                  previousMessages: payload.previousMessages,
                  messagesSoFar: payload.messagesSoFar,
                  color: payload.color,
                  muted: payload.muted ? true : undefined,
                  animate: true
                })
              } else if (cowsComeHome){  
                // 
                // $scope.data[0].dialogue[i]['collision'+$scope.userId] &&
                console.log("Else negations")
                for (var i = 0; i < $scope.data[0].dialogue.length; i++){
                  
                  if ($scope.data[0].dialogue[i].id === payload.of.id &&
                  payload.of.type === 'assertion' &&
                  $scope.hasChatFocusId === $scope.data[0].dialogue[i].id &&
                  i !== $scope.data[0].dialogue.length-1){
                    console.log("Hit. I: ", i)
                    $scope.data[0].dialogue[i]['collision'+$scope.userId] = true;
                    $scope.data[0].dialogue[i].deletedButCollided = true;
                    var theresACollision = true
                    $scope.messageToCopy = angular.copy($scope.data[0].dialogue[i]);
                    break;
                  }
                }
                console.log("Message to copy: ", $scope.messageToCopy)
                if (!$scope.messageToCopy.id){

                  for (var i = 0; i < $scope.data[0].dialogue.length; i++){
                    console.log("Message being considered: ", angular.copy($scope.data[0].dialogue[i]))
                    console.log($scope.data[0].dialogue[i].id === payload.of.id)
                    console.log(payload.of.type === 'assertion')
                    console.log(!$scope.data[0].dialogue[i]['collision'+$scope.userId])
                    if ($scope.data[0].dialogue[i].id === payload.of.id &&
                    payload.of.type === 'assertion' &&
                    !$scope.data[0].dialogue[i]['collision'+$scope.userId]){
                      console.log("Trueing: ", i)
                      $scope.data[0].dialogue[i].hiddenForAll = true;
                      $scope.messageToCopy = angular.copy($scope.data[0].dialogue[i]);
                      console.log("State now: ", $scope.data[0].dialogue[i])
                      break;
                    }
                  }
                }
                
                $scope.messageToCopy.hiddenForAll = false;
                $scope.data[0].dialogue.push($scope.messageToCopy);

                if (theresACollision){
                  console.log("Theres a collision")
                  $scope.data[0].dialogue[$scope.data[0].dialogue.length-1]['notyetseen'+$scope.userId] = true;
                }
                  
                $scope.data[0].dialogue.push(
                {
                  isMessage: true,
                  author: payload.author,
                  text: payload.text,
                  dialogueText: payload.dialogueText,
                  type: payload.type,
                  of: payload.of,
                  id: payload.id,
                  previousMessages: payload.previousMessages,
                  messagesSoFar: payload.messagesSoFar,
                  color: payload.color,
                  muted: ($scope.data[0].muteds.includes(payload.author) ? true : undefined), 
                  animate: true
                })
                // if (theresACollision){
                //   $scope.data[0].dialogue[$scope.data[0].dialogue.length-1]['notyetseen'+$scope.userId] = true;
                // }
                
                $scope.messageToCopy = {};
              }




            } else if (payload.isRejoinder && !payload.draggedProps){

              console.log("Is rejoinder dialogue printer")
              console.log("Shouldn't have fired")
              
              for (var i = 0; i < $scope.data[0].dialogue.length; i++){
                if ($scope.data[0].dialogue[i].id === payload.of.id &&
                  $scope.data[0].dialogue[i].type !== 'negation'){
                  $scope.messageToCopy = angular.copy($scope.data[0].dialogue[i]);
                  $scope.data[0].dialogue.splice(i, 1);
                }
              }
              $scope.data[0].dialogue.push($scope.messageToCopy);
              $scope.data[0].dialogue.push(
              {
                isMessage: true,
                author: payload.author,
                text: payload.text,
                dialogueText: payload.dialogueText,
                type: payload.type,
                of: payload.of,
                id: payload.id,
                previousMessages: payload.previousMessages,
                messagesSoFar: payload.messagesSoFar,
                color: payload.color,
                animate: true
              })
            }
            // console.log("About to animate")
            $timeout(function() {
              
                $scope.data[0].dialogue[$scope.data[0].dialogue.length-1].animate = false;
              
                  
                }, 1000); // The timeout duration should match the animation duration in the CSS
            $scope.messageToCopy = {};

            if (payload.author === $scope.userId && !$scope.selectedProposition.dialogueSide){
              $scope.hasChatFocusId = '';
            }

            if (apply.muteIncomingThread) {
              $scope.data[0].dialogue[$scope.data[0].dialogue.length - 1][$scope.userId] = 'hidden';
            }

            // goes split screen on the first message
            if ($scope.isMessageFresh && !$scope.fullScreenMessages){
              
              $scope.goSplitScreen();
              $scope.isMessageFresh = false;
            }

            console.log("Before already there")

            for (var i = 0; i < $scope.userColorTable.length; i++) {
              if ($scope.userColorTable[i].author === payload.author &&
                payload.author !== $scope.userId) {
                var alreadyThere = true;
                var place = i;
                break;
              }
            }
            if (!alreadyThere && payload.type !== 'topic') {
              if (payload.author !== $scope.userId) {
                $scope.userColorTable.push(
                  {
                    author: payload.author,
                    color: $scope.generateNewColor()
                  }
                );
              }
            } else if (payload.author !== $scope.userId &&
              payload.type !== 'topic') {
              if (payload.type !== 'negation') {
                //
              }
            }


            if (payload.type === 'negation'){
              for (var i = 0; i < $scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.propTarget].remarks.length;i++){
                if ($scope.data[0].nodes[apply.nodeTarget].paragraphs[apply.paragraphTarget].propositions[apply.propTarget].remarks[i].id === payload.id){
                  $scope.saveThisColorForASec = angular.copy(payload.color);
                  $scope.saveI = angular.copy(apply.nodeTarget)
                  $scope.saveJ = angular.copy(apply.paragraphTarget)
                  $scope.saveK = angular.copy(apply.propTarget)
                  $scope.saveM = angular.copy(i)
                  break;
                }

              }

              if ($scope.saveI || $scope.saveI === 0){
                $scope.data[0].nodes[$scope.saveI].paragraphs[$scope.saveJ].propositions[$scope.saveK].remarks[$scope.saveM].colorString = 
                ('3px solid ' + angular.copy($scope.saveThisColorForASec))

                if ($scope.hasBeenSetUp && payload.code){
                  if (true) {
                      console.log("Collapsing an incoming automated remark")
                      $scope.data[0].nodes[$scope.saveI].paragraphs[$scope.saveJ].propositions[$scope.saveK].remarksExpanded = false;
                    } else {
                      console.log("nothing flip")
                    }
                  
                }
              }
              $scope.saveI = '';
              $scope.saveJ = '';
              $scope.saveK = '';
              $scope.saveM = '';
              $scope.saveThisColorForASec = '';





              






            }



            if ($scope.data[0].dialogue){
              
              for (var i = 0; i < $scope.data[0].dialogue.length; i++){
                if ($scope.data[0].dialogue[i].author === $scope.userId){
                  $scope.onTheBoard = true;
                  $scope.thisMoveCounter++;
                  break;
                }
              }
            }


            temp = {};
            apply = {};
            $scope.scroll = {};

            if (payload.author === $scope.data[0].documentClaimedBy &&
              $scope.userId !== $scope.data[0].documentClaimedBy &&
              (payload.type === 'assertion' || payload.type === 'rejoinder') &&
              !$scope.inputs &&
              payload.ofParagraphId === $scope.selectedParagraph.paragraphId){
              console.log("After dialogue printer clear")
              $scope.inputs = {};
            }

            if ($scope.selectedProposition.dialogueSide && payload.author === $scope.userId){
              console.log("On the dialogue side")
              $scope.hasChatFocusId = payload.id;
              setTimeout(function () {
                  $scope.selectedProposition.dialogueSide = true;

                  
                  $scope.clearTopAndBottomHasFocus();
                  $scope.selectPropositionById(payload.id);
                  $scope.selectedProposition.textSide = false;
                  document.getElementById('input' + payload.id).click();
                  console.log("Rows: ", document.getElementById('input' + payload.id).rows);
                  // focusFactory('input' + payload.id);
                  document.getElementById('input'+payload.id).focus();
              }, 20);
            }

            $scope.scrollMessagesToBottom();
            $scope.assignFirstsToNodes();

            if (payload.author === $scope.userId){
              $scope.makePristine();
            }

            

            if (payload.type === 'negation' && $scope.userId === payload.author){
                  // setTimeout(function () {

                    if (!$scope.profile.negations){
                      // console.log("1st if")
                      profileService.getProfile().negations = [$scope.bookId]; 
                    } else {
                      // console.log("Then else")
                      profileService.getProfile().negations.push($scope.bookId)
                    }
                    // console.log("Get profile output: ", profileService.getProfile())
                    // console.log("The profile working on here: ", $scope.profile)
                    apiService.updateProfile(profileService.getProfile()).then(function (result) {
                      // console.log("That result: ", result.data)
                      // console.log("json stringified: ", JSON.parse(result.config.data))
                      $scope.profile = result.data;
                      // console.log("That profile now: ", $scope.profile)
                    }).catch(function (error) {
                      console.log("error: ", error)
                    });


                  // }, 35);
                  
                  

              
            }

            if ($scope.userId === $scope.data[0].documentClaimedBy &&
              $scope.hasBeenSetUp &&
              payload.code === '3F'){
              console.log("3F SELECTED PROP CLEAR CHECK THIS PLZ")
              $scope.selectedProposition = angular.copy({});
            }
            
            apiService.updateBook($scope.bookId, JSON.parse(angular.toJson($scope.data[0])));
            apiService.updatePropositions($scope.bookId, JSON.parse(angular.toJson($scope.propositions)));
            profileService.setSelectedBook($scope.data[0]);

            if (payload.author !== $scope.userId && $scope.inputs){
              // console.log("Satisfies that if")
              $scope.saveThisForASec = angular.copy($scope.inputs[payload.id])
            }

            for (var i = 0; i < $scope.data[0].dialogue.length; i++){
              // console.log(i, ": ", $scope.data[0].dialogue[i])
            }

           

          });
          if ($scope.saveThisForASec){
            console.log("There is a save this for a sec")
            $scope.inputs.proposition = $scope.saveThisForASec;
            $scope.inputs.leftProposition = $scope.saveThisForASec;
            $scope.saveThisForASec = '';
          }

          // if (payload.code === '1' && payload.author === $scope.userId && $scope.hasBeenSetUp){
          //   console.log("That final clear")
          //   $scope.clearTopAndBottomHasFocus();
          // }

        }, 30);                                             // HAS A TIMEOUT
        
        if ($scope.hasBeenSetUp){
          // console.log("The selected prop ds: ", angular.copy($scope.selectedProposition.dialogueSide))
          // console.log("The selected prop ts: ", angular.copy($scope.selectedProposition.textSide))
        }

        setTimeout(function () {
          $scope.$apply(function () {
            // console.log("Inputs at the end of the broadcast: ", $scope.inputs)

          });
        }, 35);
        
        function isDefinedPoint(thisPointIndex, script) {
          
          console.log("Defined point index: ", thisPointIndex)
          console.log("Defined point script: ", script)

          return script.some(point => point.index === thisPointIndex);
        }


        // SCRIPT STEP
        if ($scope.hasBeenSetUp) {
          if (payload.authorNumber || payload.authorNumber == 0){
            console.log("Payload author number: ", payload.authorNumber)
          } else {
            console.log("No payload author number")
          }
          
          for (var i = 0; i < $scope.allTheScripts.length; i++){
            console.log("Step considering: ", $scope.allTheScripts[i])
            if ($scope.allTheScripts[i].authorNumber === payload.authorNumber){
              $scope.allTheScripts[i].stack.push(payload)
              var whichScript = angular.copy(i)
              console.log("So which script: ", whichScript)
              console.log("That stack now: ", angular.copy($scope.allTheScripts[i].stack))
              break;
            }
          }

          // $scope.userActions.push(payload);
          
          console.log("About to simulate user: ", angular.copy($scope.allTheScripts[whichScript].stack.length))
          console.log("On script: ", angular.copy($scope.allTheScripts[whichScript].sequence))
          
          if (isDefinedPoint($scope.allTheScripts[whichScript].stack.length, $scope.allTheScripts[whichScript].sequence)) {
            
            if ($scope.allTheScripts[whichScript].sequence[$scope.allTheScripts[whichScript].stack.length].author === $scope.userId){
              setTimeout(function () {
                $scope.$apply(function () {
                  // console.log("Inputs at the end of the broadcast: ", $scope.inputs)
                  console.log("New step")
                  console.log("Which script: ", $scope.allTheScripts[whichScript])
                  $scope.simulateUser($scope.allTheScripts[whichScript].stack.length, $scope.allTheScripts[whichScript])
                });
              }, 35);
            } else {
              console.log("Elsing")
              setTimeout(function () {
                $scope.$apply(function () {
                  // console.log("Firing sim user fcn")
                  // console.log("Inputs at the end of the broadcast: ", $scope.inputs)
                  console.log("New step NON AUTHOR")
                  console.log("Which script: ", $scope.allTheScripts[whichScript])

                  $scope.simulateUser($scope.allTheScripts[whichScript].stack.length, $scope.allTheScripts[whichScript])
                });
              }, 8000);
            }
            
            
              // $scope.userActions[$scope.userActions.length-1].id, 
              // $scope.userActions[$scope.userActions.length-1].onIndex,
              // $scope.userActions[$scope.userActions.length-1].deletionIndex);
          } else {
            console.log("Trying to turn off")
            var turnOffYet = true;
            for (var i = 0; i < $scope.allTheScripts.length; i++){
              if ($scope.allTheScripts[i].stack.length <= $scope.allTheScripts[i].sequence.length){
                console.log("Turn off yet false")
                turnOffYet = false;
              }
            }
            console.log("Past the first turn off for")

            if (turnOffYet){
              console.log("Turning off has been set up")
              $scope.hasBeenSetUp = false;
              if ($scope.selectedProposition.textSide){
                $scope.selectedProposition.textSide = null;
              }
            }
            
            
            
            
          }
        }
        // Check if it's time to simulate the second user's action
        

        if (payload.author === $scope.userId) {
          $scope.draggedProposition = {};
          //
        }
        // console.log("User actions after incoming prop: ", $scope.allTheScripts[whichScript].sequence[$scope.allTheScripts[whichScript].length])
        $scope.clearAnimationClass();
      });

      // const tweetButton = document.getElementById('tweet-button');

      //   tweetButton.addEventListener('contextmenu', (event) => {
      //     console.log("Fired for tweet button")
      //     event.preventDefault();
      //     var thisClientX = event.clientX.toString();
      //     var thisClientY = event.clientY.toString();
      //     tweetButton.style.top = thisClientY + 'px';
      //     tweetButton.style.left = thisClientX + 'px';
      //     tweetButton.classList.add('grow');
      //   });

      $scope.whatsTheEvent = function (event) {
        // console.log("The event: ", angular.copy(event))
      }

      function flipCoin() {
          
          return Math.random() < 0.5;
        }

      $scope.clearAnimationClass = function () {
        setTimeout(function () {
          $scope.$apply(function () {
            $scope.propToAddAnimate = {};
          });
        }, 20);
      }

      $scope.selectThread = function (thread) {
        $scope.selectedThread = thread;
        $scope.hasChatFocusThreadId = thread.threadId;
      };

      $scope.clearGoddamnTextarea = function () {
        $('#' + $scope.selectedRemark.id + $scope.selectedThread.threadId)
          .parent().hide();
      };

      $scope.clickBottom = function (paragraphId) {
        $timeout(function () {
          document.getElementById(paragraphId).click();
        }, 0);
      };

      $scope.isMutedFilter = function (remark) {
        // console.log("Remark: ", remark)

        if ($scope.data && remark){
          return remark.muted || remark.deleted || remark.rejoined;
        }
        
      }

      $scope.clearTopAndBottomHasFocus = function (proposition) {
        // console.log('clear top and bottom focus')

        // if ($scope.selectedParagraph.topAdd){
        //   console.log("Clearing top add")
        //   paragraph.topAdd = false;
        // }

        $scope.hasTopFocus = '';
        $scope.hasBottomFocus = {};
        $scope.hasTopNodeFocus = {};
        $scope.hasBottomNodeFocus = '';
        // $scope.hasChatFocusId = '';
        console.log("Clear top and bottom clear")
        $scope.inputs = {};
        $scope.tweetClicked = {};
        $scope.muteClicked = {};

        if ($scope.editing){
          if (proposition){
            if (proposition.id !== $scope.editing){
              $scope.clearEditing();
            }
          } else {
            $scope.clearEditing();
          }
          
        }
        $scope.unHighlightNode();

      };

      $scope.clearThreadAdding = function () {
        $scope.threadAdding = '';
      };

      $scope.mouseOverMessageShow = function () {
        console.log("Mouseover message show")
        $scope.inputs.chatProposition = '|';
        for (var i = 0; i < $scope.data[0].nodes.length; i++){
          for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
            for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
              for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].id === id &&
                  !$scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].droppedElsewhere){
                  // console.log("SHOW HIT")
                  $scope.selectedNode = angular.copy($scope.data[0].nodes[i]);
                  $scope.selectedParagraph = angular.copy($scope.data[0].nodes[i].paragraphs[j]);

                  $scope.selectedProposition = $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m];
                  $scope.hasChatFocusId = id;
                  setTimeout(function () {
                     // console.log("HAS SHOW ID: ", $scope.hasChatFocusId)
                     focusFactory('input'+id);
                  }, 20);
                  break;
                }
              }
              if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === id &&
                !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll &&
                $scope.data[0].nodes[i].paragraphs[j].propositions[k][$scope.userId] !== 'hidden'){
                // console.log("OTHER SHOW HIT")
                $scope.selectedNode = angular.copy($scope.data[0].nodes[i]);
                $scope.selectedParagraph = angular.copy($scope.data[0].nodes[i].paragraphs[j]);

                $scope.selectedProposition = $scope.data[0].nodes[i].paragraphs[j].propositions[k];
                // console.log("Selected Node SHOW: ", $scope.selectedNode)
                // console.log("Selected Paragraph SHOW: ", $scope.selectedParagraph)
                // console.log("Selected Proposition: SHOW ", $scope.selectedProposition)
                $scope.selectedProposition.dialogueSide = true;
                $scope.selectedProposition.textSide = false;
                
                
                  
                    $scope.hasChatFocusId = id;
                

                
                setTimeout(function () {
                   console.log(document.getElementById('input'+ id));
                   focusFactory('input'+ id);
                }, 20);
                break;

              }
            }
          }
        }

        $scope.foundIt = undefined;

        function traverseArray(arr) {
          arr.forEach(function (x) {
            traverse(x);
          });
        }

        function traverseObject(obj) {
          for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
              traverse(obj[key], key, obj);
            }
          }
        }

        function traverse(x, key, obj) {
          if (isArray(x) && !$scope.foundIt) {
            traverseArray(x);
          } else if ((typeof x === 'object') && (x !== null) && !$scope.foundIt) {
            traverseObject(x);
          } else if (!$scope.foundIt){
            if (key === 'paragraphId' && !obj.isDraggedParagraph) {
              for (var i = 0; i < obj.propositions.length; i++) {
                if (obj.propositions[i].id === id && obj.propositions[i][$scope.userId] !== 'hidden' &&
                  !obj.propositions[i].hiddenForAll){
                    $scope.selectedParagraph = angular.copy(obj);
                    $scope.selectedProposition = angular.copy(obj.propositions[i]);
                    $scope.selectedNode = eval(obj.propositions[i].nodePath);
                    $scope.foundIt = true;
                    break;
                }
              }

              setTimeout(function () {
                $scope.mark = {};
                $scope.highlight = {};
                if ($scope.selectedProposition) {
                  if ($scope.selectedProposition.id) {
                    $('#' + $scope.selectedProposition.id + $scope.selectedThread.threadId)
                          .expanding();
                    $('#' + $scope.selectedProposition.id + $scope.selectedThread.threadId)
                          .expanding();
                    $scope.hasChatFocusId = $scope.selectedProposition.id;
                  } else {
                    $('#' + $scope.selectedProposition.id + $scope.selectedThread.threadId)
                          .expanding();
                    $('#' + $scope.selectedProposition.id + $scope.selectedThread.threadId)
                          .expanding();
                    $scope.hasChatFocusId = $scope.selectedProposition.id;
                  }
                } else {
                  $('#' + $scope.selectedProposition.id + $scope.selectedThread.threadId)
                        .expanding();
                  $('#' + $scope.selectedProposition.id + $scope.selectedThread.threadId)
                        .expanding();
                  $scope.hasChatFocusId = $scope.selectedProposition.id;
                }
                $scope.selectedProposition.dialogueSide = true;
                var destination = document.getElementById('proposition' + $scope.selectedProposition.id);
                if (destination) {
                  destination.scrollIntoView({behavior: 'smooth'});
                }
                var query = '#' + $scope.selectedProposition.id + $scope.selectedThread.threadId;
                $scope.$apply(function () {
                  $(query).parent().show();
                  $(query).expanding();
                  $(query).focus();
                });
              }, 20);
              temp = {};
              if ($scope.foundIt){
                return;
              }

            }
          }
        }
      }

      $scope.selectPropositionById = function (id) {
        console.log("Selecting by id")
        $scope.inputs.chatProposition = '';
        for (var i = 0; i < $scope.data[0].nodes.length; i++){
          for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
            for (var k = 0; k < $scope.data[0].nodes[i].paragraphs[j].propositions.length; k++){
              for (var m = 0; m < $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length; m++){
                if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].id === id &&
                  !$scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].droppedElsewhere){
                  console.log("Hit by id")
                  $scope.selectedNode = angular.copy($scope.data[0].nodes[i]);
                  $scope.selectedParagraph = angular.copy($scope.data[0].nodes[i].paragraphs[j]);

                  $scope.selectedProposition = $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m];
                  $scope.hasChatFocusId = id;
                  setTimeout(function () {
                     console.log("Has chat focus id: ", $scope.hasChatFocusId)
                     focusFactory('input'+id);
                  }, 20);
                  break;
                }
              }
              if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === id &&
                !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll &&
                $scope.data[0].nodes[i].paragraphs[j].propositions[k][$scope.userId] !== 'hidden'){
                console.log("Other hit by id")
                $scope.selectedNode = angular.copy($scope.data[0].nodes[i]);
                $scope.selectedParagraph = angular.copy($scope.data[0].nodes[i].paragraphs[j]);

                $scope.selectedProposition = $scope.data[0].nodes[i].paragraphs[j].propositions[k];
                // console.log("Selected Node: ", $scope.selectedNode)
                // console.log("Selected Paragraph: ", $scope.selectedParagraph)
                // console.log("Selected Proposition: ", $scope.selectedProposition)
                $scope.selectedProposition.dialogueSide = true;
                $scope.selectedProposition.textSide = false;
                
                
                  
                    $scope.hasChatFocusId = id;
                

                
                setTimeout(function () {
                   if ($scope.selectedProposition.textSide){
                    $scope.selectedProposition.textSide = null;
                   }
                   console.log("Final sp: ", angular.copy($scope.selectedProposition))
                   console.log(document.getElementById('input'+ id));
                   focusFactory('input'+ id);
                }, 20);
                break;

              }
            }
          }
        }

        $scope.foundIt = undefined;

        function traverseArray(arr) {
          arr.forEach(function (x) {
            traverse(x);
          });
        }

        function traverseObject(obj) {
          for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
              traverse(obj[key], key, obj);
            }
          }
        }

        function traverse(x, key, obj) {
          if (isArray(x) && !$scope.foundIt) {
            traverseArray(x);
          } else if ((typeof x === 'object') && (x !== null) && !$scope.foundIt) {
            traverseObject(x);
          } else if (!$scope.foundIt){
            if (key === 'paragraphId' && !obj.isDraggedParagraph) {
              for (var i = 0; i < obj.propositions.length; i++) {
                if (obj.propositions[i].id === id && obj.propositions[i][$scope.userId] !== 'hidden' &&
                  !obj.propositions[i].hiddenForAll){
                    $scope.selectedParagraph = angular.copy(obj);
                    $scope.selectedProposition = angular.copy(obj.propositions[i]);
                    $scope.selectedNode = eval(obj.propositions[i].nodePath);
                    $scope.foundIt = true;
                    break;
                }
              }

              setTimeout(function () {
                $scope.mark = {};
                $scope.highlight = {};
                if ($scope.selectedProposition) {
                  if ($scope.selectedProposition.id) {
                    $('#' + $scope.selectedProposition.id + $scope.selectedThread.threadId)
                          .expanding();
                    $('#' + $scope.selectedProposition.id + $scope.selectedThread.threadId)
                          .expanding();
                    $scope.hasChatFocusId = $scope.selectedProposition.id;
                  } else {
                    $('#' + $scope.selectedProposition.id + $scope.selectedThread.threadId)
                          .expanding();
                    $('#' + $scope.selectedProposition.id + $scope.selectedThread.threadId)
                          .expanding();
                    $scope.hasChatFocusId = $scope.selectedProposition.id;
                  }
                } else {
                  $('#' + $scope.selectedProposition.id + $scope.selectedThread.threadId)
                        .expanding();
                  $('#' + $scope.selectedProposition.id + $scope.selectedThread.threadId)
                        .expanding();
                  $scope.hasChatFocusId = $scope.selectedProposition.id;
                }
                $scope.selectedProposition.dialogueSide = true;
                var destination = document.getElementById('proposition' + $scope.selectedProposition.id);
                if (destination) {
                  destination.scrollIntoView({behavior: 'smooth'});
                }
                var query = '#' + $scope.selectedProposition.id + $scope.selectedThread.threadId;
                $scope.$apply(function () {
                  $(query).parent().show();
                  $(query).expanding();
                  $(query).focus();
                });
              }, 20);
              temp = {};
              if ($scope.foundIt){
                return;
              }

            }
          }
        }
      };

      $scope.saveForLater = function (remarkId, thread) {
        $scope.toSetLater = {
          remarkId: remarkId,
          threadId: thread.threadId
        };
      };

      $scope.clearDragDetector = function () {
        console.log("Clear drag RAN")
      }

      $scope.resetFromEnter = function () {
        console.log("Resetting from enter")
        $scope.inputs = {};
      }

      $scope.savePropositionForLater = function (id, position, paragraph) {

        $scope.propositionToSetLater = {
          id: id,
          position: position
        };
        $scope.paragraphToSetLater = paragraph;
      };

      $scope.clearSavePropositionForLater = function () {

        $scope.propositionToSetLater = {};
        $scope.paragraphToSetLater = {};
      }

      $scope.showTextArea = function () {
        $scope.selectThread($scope.toSetLater.thread);
        $scope.selectPropositionById($scope.toSetLater.remarkId);
      };

      $scope.confirmIfVisibleParagraph = function(paragraphId){
        if (document.getElementById('paragraph' + paragraphId)){
          return true;
        } else {
          return false;
        }
      }

      $scope.textareaBlur = function (message) {
        // return;
        // if (message['collision'+$scope.userId] == true){
          
        //   setTimeout(function () {
        //     $scope.$apply(function () {
        //       for (var i = 0; i < $scope.data[0].dialogue.length; i++){
        //         if($scope.data[0].dialogue[i]['notyetseen'+$scope.userId]){
        //           $scope.data[0].dialogue[i]['notyetseen'+$scope.userId] = false;
        //         } else if ($scope.data[0].dialogue[i]['collision'+$scope.userId]){
        //           $scope.data[0].dialogue[i]['collision'+$scope.userId] = false;
        //         }
        //       }
        //       // message['collision'+$scope.userId] = false;
        //     });

        //   }, 20);
        // }
        // // $scope.hasChatFocusId = '';
        // console.log("Blurred a textarea: ", message.dialogueText)
      }

      $scope.theresSomething = function () {
        console.log("Something at least")
      }

      $scope.scrollMessagesToBottom = function () {
        $timeout(function () {
          var pane = document.getElementById('dialoguelist');
          if ($scope.shortEditor){
            pane.scrollTop = pane.scrollHeight;
          } else {
            pane.scrollTop = pane.scrollHeight + 300;
          }
          
        }, 20);
      };

      $scope.blurLightUpLastVisiblePropositionInBook = function (book, event) {
        // console.log("blur light up book")
        var apply = {};
        apply.path = '$scope.data[0]';
        apply.destination = eval(apply.path);
        apply.id = '';
        apply.flagged;

        for (var i = $scope.data[0].nodes.length-1; i > -1; i--){
          if (!$scope.data[0].nodes[i].minimized){
            for (var j = $scope.data[0].nodes[i].paragraphs.length-1; j > -1; j--){
              for (var k = $scope.data[0].nodes[i].paragraphs[j].propositions.length-1; k > -1; k--){
                if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length > 0){
                  for (var m = $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks.length-1; m > -1; m--){
                    if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m][$scope.userId] !== 'hidden' &&
                      !$scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].hiddenForAll){
                      $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[m].preSelected = false;
                      return;
                    }
                  }
                } else {
                  $scope.data[0].nodes[i].paragraphs[j].propositions[k].preSelected = false;
                  return;
                }
              }
            }
          }
        }

        apply = {};
      };




      $scope.setupScript = function () {
        $scope.hasBeenSetUpBefore = true;
        $timeout(function () {
            console.log("Setting up script")
            $scope.hasBeenSetUp = true;
            
            $scope.userActions = []; // Store the sequence of user actions and their payloads
            // payloadData: {
            //   author: $scope.userId,
            //   text: 'A ifrst sentence of text and all this text so much text and what about hte text.',
            //   type: 'assertion',
            //   dialogueSide: false,
            //   step: 'na'
            //   which: [node,item, theBlank]
            //   on: [id, nodeId]
            //   its [self, left, top, bottom, nodetop, nodebottom]
            //   blankId: IdFactory.next(),
            //   textSide: true,
            //   bookId: $scope.bookId,
            //   nodeId: IdFactory.next(),
            //   paragraphId: IdFactory.next(),
            //   remarkId: IdFactory.next(),
            //   dropflag: false,
            //   typeTime: 3000,
            //   noClick: false, 
            //   action: proposition
            // } 
            
            $scope.listOfLethalities = [
              { index: 0, 
                
                  author: $scope.userId,
                  text: 'AGI will not be upper-bounded by human ability or the speed of human learning.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  step: undefined,
                  which: 'theBlank',
                  on: undefined,
                  its: undefined,
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                  
                
              },
              { index: 1, 
                
                  author: $scope.userId,
                  text: 'A cognitive system with sufficiently high cognitive powers, given any medium-bandwidth channel of causal influence, will not find it difficult to bootstrap to overpowering capabilities independent of human infrastructure.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: true,
                  which: 'item',
                  on: 0,
                  its: 'bottom',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: false
                
              },
              { index: 2, 
                
                  author: $scope.userId,
                  text: "We need to get alignment right on the 'first critical try' at operating at a 'dangerous' level of intelligence, where unaligned operation at a dangerous level of intelligence kills everybody on Earth and then we don't get to try again.",
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: true,
                  which: 'item',
                  on: 1,
                  its: 'bottom',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: false
                
              },
              { index: 3, 
                
                  author: $scope.userId,
                  text: "We can't 'decide not to build AGI' because GPUs are everywhere, and knowledge of algorithms is constantly being improved and published",
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: true,
                  which: 'item',
                  on: 2,
                  its: 'bottom',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: false
                
              },
              { index: 4, 
               
                  author: 'aaa',
                  text: 'We’d just make smarter systems to monitor the AGI.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 0,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
             
              },
              { index: 5, 
               
                  author: 'bbb',
                  text: "We’d know it immediately if an evil AI were plotting to overpower us.”",
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 1,
                  its: 'self',
                  typeTime: 5000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
              
              },
              { index: 6, 
               
                  author: 'ccc',
                  text: 'Techniques will be developed to make the inscrutable matrices highly readable.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 1,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
              
              },
              { index: 7, 
                
                  author: $scope.userId,
                  text: "We can't just build a very weak system, which is less dangerous because it is so weak, and declare victory; because later there will be more actors that have the capability to build a stronger system and one of them will do so.",
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: true,
                  which: 'item',
                  on: 3,
                  its: 'bottom',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
                
              },
              { index: 8, 
               
                  author: 'ddd',
                  text: 'The best engineers in the world are on it and will consider all possible lethalities.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 2,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
              
              },
              { index: 9, 
                
                  author: $scope.userId,
                  text: "It is not naturally (by default, barring intervention) the case that everything takes place on a timescale that makes it easy for us to react.",
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: true,
                  which: 'item',
                  on: 4,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
                
              },
              { index: 10, 
               
                  author: 'ddd',
                  text: "An international moratorium on AGI development will come into being once politicians are aware of the danger.",
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 7,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
              
              },
              { index: 11, 
                
                  author: $scope.userId,
                  text: "We can gather all sorts of information beforehand from less powerful systems that will not kill us if we screw up operating them; but once we are running more powerful systems, we can no longer update on sufficiently catastrophic errors.",
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: true,
                  which: 'item',
                  on: 8,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
                
              },

            ];

            $scope.geocentrism = [
              { index: 0, 
                
                  author: $scope.userId,
                  text: 'The Earth is clearly fixed at the center of the universe.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  step: undefined,
                  which: 'theBlank',
                  on: undefined,
                  its: undefined,
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                  
                
              },
              { index: 1, 
                
                  author: $scope.userId,
                  text: 'A wealth of everyday observational evidence makes this clear, including the revolution of the sun, moon, and stars.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: true,
                  which: 'item',
                  on: 0,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: false
                
              },
              { index: 2, 
                
                  author: $scope.userId,
                  text: 'The uniform density of stars orbiting Earth also confirms this centrality.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: true,
                  which: 'item',
                  on: 1,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: false
                
              },
              { index: 3, 
                
                  author: $scope.userId,
                  text: 'Furthermore, scriptural evidence for a revolving sun and moon is clear; see Genesis 1:16, Joshua 10:13, and Isaiah 48:13.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: true,
                  which: 'item',
                  on: 2,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: false
                
              },
              { index: 4, 
               
                  author: 'aaa',
                  text: 'Given a thick enough density of stars, planets at the periphery would be judged to be at the center which were not.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 2,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
             
              },
              { index: 5, 
               
                  author: 'bbb',
                  text: 'How come telescopes show us that celestial bodies all exert gravitational forces on each other, but Earth is not affected?',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 0,
                  its: 'self',
                  typeTime: 5000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
              
              },
              { index: 6, 
               
                  author: 'ccc',
                  text: 'Telescopes allow us to see phases to Venus where its lit portion always faces the Sun - how is this explained?',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 1,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
              
              },
              { index: 7, 
                
                  author: $scope.userId,
                  text: "The solidity of the Earth shows that it is exempt from the forces that move the celestial bodies around it.",
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: true,
                  which: 'item',
                  on: 5,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
                
              },
              { index: 8, 
               
                  author: 'ddd',
                  text: 'Scriptural evidence can be unreliable.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 3,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
              
              },
              { index: 9, 
                
                  author: $scope.userId,
                  text: 'Scripture is incapable of error and since it models a geocentric universe, we must be living in one.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: true,
                  which: 'item',
                  on: 8,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: false
                
              },
              { index: 10, 
               
                  author: 'ddd',
                  text: 'Whose scripture? And what about when scripture contradicts itself?',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 9,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
              
              },
              { index: 11, 
                
                  author: $scope.userId,
                  text: "The repeating cycle of seasons and the Earth's general stability shows that it is immune from celestial changes.",
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: true,
                  which: 'item',
                  on: 7,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: false
                
              },

            ];

            $scope.coinbase = { authorNumber: 0, stack: [], sequence: [
              { index: 0, 
                
                  author: $scope.userId,
                  text: 'INTRODUCTION AND SUMMARY OF ARGUMENT:',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'theBlank',
                  on: undefined,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 1, 
                
                  author: $scope.userId,
                  text: 'SEC v. Coinbase is the latest installment in the SEC’s escalating campaign against digital assets, often referred to as “cryptocurrencies,” “crypto,” or “tokens”',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: true,
                  which: 'item',
                  on: 0,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  onBlank: true
                
              },
              { index: 2, 
                
                  author: $scope.userId,
                  text: 'As this case demonstrates, the SEC is choosing to use the blunt and unpredictable tool of enforcement proceedings, to the exclusion of all other methods, to regulate the trillion-dollar digital asset industry.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  which: 'item',
                  on: 1,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                
              },
              { index: 3, 
                
                  author: $scope.userId,
                  text: 'For years, digital asset industry members have asked the SEC to provide clarity about the precise question now at issue: which digital assets are securities, and when is registration required for companies like Coinbase that facilitate trading in a range of digital assets.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'item',
                  on: 2,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 4, 
                
                  author: $scope.userId,
                  text: 'Rather than transparently working with an innovative, nascent industry in which millions of Americans hold valuable assets, the SEC has resorted to increasingly arbitrary and aggressive enforcement tactics that leave industry players confused about how to avoid becoming the subject of the next enforcement proceeding.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'item',
                  on: 3,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 5, 
                
                  author: $scope.userId,
                  text: 'In public statements and media campaigns, this SEC appears to be boasting about its efforts. See Gary Gensler, Op-Ed: The SEC Treats Crypto Like the Rest of the Capital Markets, SEC (Aug. 19, 2022), perma.cc/YQ5K-VLG9 (Chair Gensler touting that “the SEC will serve as the cop on the beat” with respect to digital assets).',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'item',
                  on: 4,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 6, 
                
                  author: $scope.userId,
                  text: 'But the SEC cannot arbitrarily decide whether to drive such a major industry out of the United States.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'item',
                  on: 5,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 7, 
                
                  author: $scope.userId,
                  text: 'Coinbase—the latest digital asset exchange to come up on the SEC’s roulette wheel—has rightly taken decisive action by moving for judgment on the pleadings.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'item',
                  on: 6,
                  its: 'bottom',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 8, 
               
                  author: 'aaa',
                  text: "Can we provide an initial reason to move for judgment, perhaps related to secondary contracts being misclassified?",
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 7,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
              
              },
              // { index: 9, 
                
              //     author: $scope.userId,
              //     text: 'The SEC’s claim that certain digital assets subject to secondary sales on Coinbase’s platform are “investment contracts” under the securities laws is baseless.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'assertion',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),

              //     which: 'item',
              //     on: 8,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
                
              // },
              // { index: 10, 
                
              //     author: $scope.userId,
              //     text: 'The longstanding Howey test for determining whether something is an “investment contract,” and thus a security, makes clear that any individual digital asset is no more a security than an orange in an orange grove.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'assertion',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),

              //     which: 'item',
              //     on: 9,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
                
              // },
              // { index: 11, 
               
              //     author: 'aaa',
              //     text: "And how exactly is cryptocurrency like an orange?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 10,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 12, 
               
              //     author: $scope.userId,
              //     text: 'In some circumstances—not at issue here—digital assets can be the subject of an investment contract, but that is all.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 11,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              
              // }, // 
              // { index: 13, 
                
              //     author: $scope.userId,
              //     text: 'A recent ruling in this district confirms that while it is possible for a digital asset to be a part of an “investment contract,” the digital assets themselves are not securities.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'assertion',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),

              //     which: 'item',
              //     on: 12,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
                
              // },
              // { index: 14, 
               
              //     author: 'aaa',
              //     text: "Which?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 13,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 15, 
               
              //     author: $scope.userId,
              //     text: 'See SEC v. Ripple Labs, Inc., 2023 WL 4507900 (S.D.N.Y. July 13, 2023).',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 14,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              
              // }, 
              // { index: 16, 
               
              //     author: $scope.userId,
              //     text: 'The subsequent decision in SEC v. Terraform Labs Pte. Ltd., 2023 WL 4858299 (S.D.N.Y. July 31, 2023), is consistent with this premise; Terraform recognized that a digital asset itself is not an “investment contract,” concluding only that the digital assets at issue were the subject of an “investment contract.” Id. at *12.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 15,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              
              // }, 
              // { index: 17, 
               
              //     author: 'aaa',
              //     text: "What is at stake here?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 16,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 18, 
               
              //     author: $scope.userId,
              //     text: 'It is important to keep view of what is at stake.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 17,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // }, 
              // { index: 19, 
               
              //     author: 'aaa',
              //     text: "And that is?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 18,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 20, 
               
              //     author: $scope.userId,
              //     text: 'Digital assets represent a significant segment of the global economy and an integral part of the American financial system.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 19,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: false
              
              // }, 
              // { index: 21, 
               
              //     author: 'bbb',
              //     text: "Would the size of the cryptocurrency industry be a legal for the SEC not to regulate it?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 20,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 22, 
               
              //     author: 'ccc',
              //     text: "Provide an argument from public utility.",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 20,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },// This is not just about speculative or institutional trading— millions of Americans use digital assets for everyday financial transactions.
              // { index: 23, 
               
              //     author: $scope.userId,
              //     text: 'This is not just about speculative or institutional trading—millions of Americans use digital assets for everyday financial transactions.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 22,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: false
              
              // }, 
              // { index: 24, 
               
              //     author: 'ccc',
              //     text: "The SEC feels a need to regulate according to how it interprets its own enabling statute",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 23,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 25, 
               
              //     author: 'ddd',
              //     text: "Show the importance of crypto as money.",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 23,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },// 
              // { index: 26, 
               
              //     author: 'eee',
              //     text: "What about an antiquarian discussion of gold and silver-backed currency?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 23,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },// 
              // { index: 27, 
               
              //     author: $scope.userId,
              //     text: 'The SEC’s regulation-by-enforcement approach is not only detrimental to the industry, it also directly impacts individual Americans who use digital assets.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 25,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: false
              
              // }, 
            ]
            };
            
            
            $scope.coinbase2 = { authorNumber: 1, stack: [], sequence: [
              { index: 0, 
                
                  author: '111',
                  text: 'ARGUMENT:',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'theBlank',
                  on: undefined,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 1, 
                
                  author: '111',
                  text: 'The SEC’s shoot-first-and-provide-guidance-never approach threatens the U.S. digital asset industry.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: true,
                  on: 0,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  onBlank: true
                
              },
              { index: 2, 
               
                  author: 'ccc',
                  text: "Spell it out for us.",
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 1,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
              
              },
              { index: 3, 
                
                  author: '111',
                  text: 'The SEC’s decision to regulate digital assets through one-off enforcement actions rather than the ordinary tools of economic regulation is destructive to the digital asset industry and the livelihoods of the millions of people and businesses who rely on digital assets and exchanges.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'item',
                  on: 2,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: false
                
              },
              { index: 4, 
                
                  author: '111',
                  text: 'The SEC’s sole suggestion—that digital assets and exchanges simply “come in and register” under the securities laws—is a hollow promise that has failed in practice and elides reality.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'item',
                  on: 3,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 5, 
                
                  author: '111',
                  text: 'Though it has already left an indelible mark on the global economy, the digital asset industry is still in its infancy.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'item',
                  on: 4,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 6, 
                
                  author: '111',
                  text: 'The first digital asset emerged just 14 years ago.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'item',
                  on: 5,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 7, 
                
                  author: '111',
                  text: 'Those 14 years have been marked by unending innovations in technology and constant, rapid evolution.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'item',
                  on: 6,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 8, 
                
                  author: '111',
                  text: 'Today, there are tens of thousands of unique digital assets on the market, available on hundreds of exchanges worldwide, representing a total market capitalization of approximately $1.2 trillion.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'item',
                  on: 7,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 8, 
               
                  author: 'aaa',
                  text: "Source?",
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 7,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
              
              },
              // { index: 9, 
                
              //     author: '111',
              //     text: 'Today, there are tens of thousands of unique digital assets on the market, available on hundreds of exchanges worldwide, representing a total market capitalization of approximately $1.2 trillion.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'assertion',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),

              //     which: 'item',
              //     on: 8,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition'
                
              // },
              // { index: 9, 
                
              //     author: $scope.userId,
              //     text: 'The SEC’s claim that certain digital assets subject to secondary sales on Coinbase’s platform are “investment contracts” under the securities laws is baseless.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'assertion',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),

              //     which: 'item',
              //     on: 8,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
                
              // },
              // { index: 10, 
                
              //     author: $scope.userId,
              //     text: 'The longstanding Howey test for determining whether something is an “investment contract,” and thus a security, makes clear that any individual digital asset is no more a security than an orange in an orange grove.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'assertion',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),

              //     which: 'item',
              //     on: 9,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
                
              // },
              // { index: 11, 
               
              //     author: 'aaa',
              //     text: "And how exactly is cryptocurrency like an orange?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 10,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 12, 
               
              //     author: $scope.userId,
              //     text: 'In some circumstances—not at issue here—digital assets can be the subject of an investment contract, but that is all.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 11,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              
              // }, // 
              // { index: 13, 
                
              //     author: $scope.userId,
              //     text: 'A recent ruling in this district confirms that while it is possible for a digital asset to be a part of an “investment contract,” the digital assets themselves are not securities.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'assertion',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),

              //     which: 'item',
              //     on: 12,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
                
              // },
              // { index: 14, 
               
              //     author: 'aaa',
              //     text: "Which?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 13,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 15, 
               
              //     author: $scope.userId,
              //     text: 'See SEC v. Ripple Labs, Inc., 2023 WL 4507900 (S.D.N.Y. July 13, 2023).',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 14,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              
              // }, 
              // { index: 16, 
               
              //     author: $scope.userId,
              //     text: 'The subsequent decision in SEC v. Terraform Labs Pte. Ltd., 2023 WL 4858299 (S.D.N.Y. July 31, 2023), is consistent with this premise; Terraform recognized that a digital asset itself is not an “investment contract,” concluding only that the digital assets at issue were the subject of an “investment contract.” Id. at *12.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 15,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              
              // }, 
              // { index: 17, 
               
              //     author: 'aaa',
              //     text: "What is at stake here?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 16,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 18, 
               
              //     author: $scope.userId,
              //     text: 'It is important to keep view of what is at stake.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 17,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // }, 
              // { index: 19, 
               
              //     author: 'aaa',
              //     text: "And that is?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 18,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 20, 
               
              //     author: $scope.userId,
              //     text: 'Digital assets represent a significant segment of the global economy and an integral part of the American financial system.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 19,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: false
              
              // }, 
              // { index: 21, 
               
              //     author: 'bbb',
              //     text: "Would the size of the cryptocurrency industry be a legal for the SEC not to regulate it?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 20,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 22, 
               
              //     author: 'ccc',
              //     text: "Provide an argument from public utility.",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 20,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },// This is not just about speculative or institutional trading— millions of Americans use digital assets for everyday financial transactions.
              // { index: 23, 
               
              //     author: $scope.userId,
              //     text: 'This is not just about speculative or institutional trading—millions of Americans use digital assets for everyday financial transactions.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 22,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: false
              
              // }, 
              // { index: 24, 
               
              //     author: 'ccc',
              //     text: "The SEC feels a need to regulate according to how it interprets its own enabling statute",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 23,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 25, 
               
              //     author: 'ddd',
              //     text: "Show the importance of crypto as money.",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 23,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },// 
              // { index: 26, 
               
              //     author: 'eee',
              //     text: "What about an antiquarian discussion of gold and silver-backed currency?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 23,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },// 
              // { index: 27, 
               
              //     author: $scope.userId,
              //     text: 'The SEC’s regulation-by-enforcement approach is not only detrimental to the industry, it also directly impacts individual Americans who use digital assets.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 25,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: false
              
              // }, 
            ]
            };

            $scope.allTheScripts = [$scope.coinbase, $scope.coinbase2]







            $scope.nodeAdd = [
              { index: 0, 
                
                  author: $scope.userId,
                  text: 'INTRODUCTION AND SUMMARY OF ARGUMENT.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'theBlank',
                  on: undefined,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 1, 
                
                  author: $scope.userId,
                  text: 'Section eh',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: true,
                  which: 'node',
                  nodeAdd: true,
                  on: 0,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  onBlank: true
                
              },
              // { index: 2, 
                
              //     author: $scope.userId,
              //     text: 'As this case demonstrates, the SEC is choosing to use the blunt and unpredictable tool of enforcement proceedings, to the exclusion of all other methods, to regulate the trillion-dollar digital asset industry.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'assertion',
              //     dialogueSide: true,
              //     which: 'item',
              //     on: 1,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
                
              // },
              // { index: 3, 
                
              //     author: $scope.userId,
              //     text: 'For years, digital asset industry members have asked the SEC to provide clarity about the precise question now at issue: which digital assets are securities, and when is registration required for companies like Coinbase that facilitate trading in a range of digital assets.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'assertion',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),

              //     which: 'item',
              //     on: 2,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition'
                
              // },
              // { index: 4, 
                
              //     author: $scope.userId,
              //     text: 'Rather than transparently working with an innovative, nascent industry in which millions of Americans hold valuable assets, the SEC has resorted to increasingly arbitrary and aggressive enforcement tactics that leave industry players confused about how to avoid becoming the subject of the next enforcement proceeding.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'assertion',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),

              //     which: 'item',
              //     on: 3,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition'
                
              // },
              // { index: 5, 
                
              //     author: $scope.userId,
              //     text: 'In public statements and media campaigns, this SEC appears to be boasting about its efforts. See Gary Gensler, Op-Ed: The SEC Treats Crypto Like the Rest of the Capital Markets, SEC (Aug. 19, 2022), perma.cc/YQ5K-VLG9 (Chair Gensler touting that “the SEC will serve as the cop on the beat” with respect to digital assets).',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'assertion',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),

              //     which: 'item',
              //     on: 4,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition'
                
              // },
              // { index: 6, 
                
              //     author: $scope.userId,
              //     text: 'But the SEC cannot arbitrarily decide whether to drive such a major industry out of the United States.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'assertion',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),

              //     which: 'item',
              //     on: 5,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition'
                
              // },
              // { index: 7, 
                
              //     author: $scope.userId,
              //     text: 'Coinbase—the latest digital asset exchange to come up on the SEC’s roulette wheel—has rightly taken decisive action by moving for judgment on the pleadings.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'assertion',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),

              //     which: 'item',
              //     on: 6,
              //     its: 'bottom',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition'
                
              // },
              // { index: 8, 
               
              //     author: 'aaa',
              //     text: "Can we provide an initial reason to move for judgment, perhaps related to secondary contracts being misclassified?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 7,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 9, 
                
              //     author: $scope.userId,
              //     text: 'The SEC’s claim that certain digital assets subject to secondary sales on Coinbase’s platform are “investment contracts” under the securities laws is baseless.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'assertion',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),

              //     which: 'item',
              //     on: 8,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
                
              // },
              // { index: 10, 
                
              //     author: $scope.userId,
              //     text: 'The longstanding Howey test for determining whether something is an “investment contract,” and thus a security, makes clear that any individual digital asset is no more a security than an orange in an orange grove.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'assertion',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),

              //     which: 'item',
              //     on: 9,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
                
              // },
              // { index: 11, 
               
              //     author: 'aaa',
              //     text: "And how exactly is cryptocurrency like an orange?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 10,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 12, 
               
              //     author: $scope.userId,
              //     text: 'In some circumstances—not at issue here—digital assets can be the subject of an investment contract, but that is all.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 11,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              
              // }, // 
              // { index: 13, 
                
              //     author: $scope.userId,
              //     text: 'A recent ruling in this district confirms that while it is possible for a digital asset to be a part of an “investment contract,” the digital assets themselves are not securities.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'assertion',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),

              //     which: 'item',
              //     on: 12,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
                
              // },
              // { index: 14, 
               
              //     author: 'aaa',
              //     text: "Which?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 13,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 15, 
               
              //     author: $scope.userId,
              //     text: 'See SEC v. Ripple Labs, Inc., 2023 WL 4507900 (S.D.N.Y. July 13, 2023).',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 14,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              
              // }, 
              // { index: 16, 
               
              //     author: $scope.userId,
              //     text: 'The subsequent decision in SEC v. Terraform Labs Pte. Ltd., 2023 WL 4858299 (S.D.N.Y. July 31, 2023), is consistent with this premise; Terraform recognized that a digital asset itself is not an “investment contract,” concluding only that the digital assets at issue were the subject of an “investment contract.” Id. at *12.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 15,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              
              // }, 
              // { index: 17, 
               
              //     author: 'aaa',
              //     text: "What is at stake here?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 16,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 18, 
               
              //     author: $scope.userId,
              //     text: 'It is important to keep view of what is at stake.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 17,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // }, 
              // { index: 19, 
               
              //     author: 'aaa',
              //     text: "And that is?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 18,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 20, 
               
              //     author: $scope.userId,
              //     text: 'Digital assets represent a significant segment of the global economy and an integral part of the American financial system.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 19,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: false
              
              // }, 
              // { index: 21, 
               
              //     author: 'bbb',
              //     text: "Would the size of the cryptocurrency industry be a legal for the SEC not to regulate it?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 20,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 22, 
               
              //     author: 'ccc',
              //     text: "Provide an argument from public utility.",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 20,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },// This is not just about speculative or institutional trading— millions of Americans use digital assets for everyday financial transactions.
              // { index: 23, 
               
              //     author: $scope.userId,
              //     text: 'This is not just about speculative or institutional trading—millions of Americans use digital assets for everyday financial transactions.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 22,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: false
              
              // }, 
              // { index: 24, 
               
              //     author: 'ccc',
              //     text: "The SEC feels a need to regulate according to how it interprets its own enabling statute",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 23,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },
              // { index: 25, 
               
              //     author: 'ddd',
              //     text: "Show the importance of crypto as money.",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 23,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },// 
              // { index: 26, 
               
              //     author: 'eee',
              //     text: "What about an antiquarian discussion of gold and silver-backed currency?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 23,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: true
              
              // },// 
              // { index: 27, 
               
              //     author: $scope.userId,
              //     text: 'The SEC’s regulation-by-enforcement approach is not only detrimental to the industry, it also directly impacts individual Americans who use digital assets.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 25,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     messaged: false
              
              // }, 

            ];

            $scope.dawnOfChemotherapy = [
              { index: 0, 
                
                  author: $scope.userId,
                  text: 'Cancer left untreated overwhelms the body’s systems through rapid growth of cancerous tissues.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  step: undefined,
                  which: 'theBlank',
                  on: undefined,
                  its: undefined,
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                  
                
              },
              { index: 1, 
               
                  author: 'aaa',
                  text: 'It also involves the production of faulty cells and renders tissues unable to maintain the body’s homeostasis.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 0,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
             
              },
              { index: 2, 
                
                  author: $scope.userId,
                  text: 'Compounds that slow down the growth of cancers might be investigated for their therapeutic value.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: true,
                  which: 'item',
                  on: 0,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                
              },
              { index: 3, 
                
                  author: $scope.userId,
                  text: 'Mustard Agents and Lymphatic Activity',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'node',
                  on: 2,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 4, 
               
                  author: 'bbb',
                  text: 'Treatments of this type would destroy tissues in the body too broadly to be of medical use.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 2,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
              
              },
              { index: 5, 
                
                  author: $scope.userId,
                  text: 'Sulphur mustard might be a candidate for “chemical” cancer therapy.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'item',
                  on: 3,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  onBlank: true
                
              },
              { index: 6, 
               
                  author: $scope.userId,
                  text: 'In laboratory studies on animals, it was found that nitrogen mustard induced severe white blood cell and lymphatic suppression.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 5,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
              
              },
              { index: 7, 
                
                  author: 'bbb',
                  text: 'Other substances might cause the same effect, or the experiment was run on a faulty control group.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'item',
                  on: 6,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 8, 
               
                  author: 'ccc',
                  text: 'Mustard agents of any kind cannot have therapeutic value.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 6,
                  its: 'self',
                  typeTime: 5000,
                  noClick: false, 
                  action: 'proposition'
              
              },
              { index: 9, 
               
                  author: $scope.userId,
                  text: 'A review of other substances shows this leucopenia is exceptional, and the same results were found in subsequent animal trials.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 7,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
              
              },
              { index: 10, 
               
                  author: $scope.userId,
                  text: 'Victims exposed to an accidental release of sulphur mustard showed the same leucopenia as was observed in animals.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 9,
                  its: 'bottom',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  onBlank: true
              
              },
              { index: 11, 
               
                  author: 'ccc',
                  text: 'Sulphur mustard is known to cause unacceptable damage to the body as demonstrated in the trenches of the Western Front during the First World War.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  
                  dialogueSide: false,
                  type: 'negation',
                  code: '2A',
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 10,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
              
              },
              { index:12, 
               
                  author: $scope.userId,
                  text: 'People exposed to a release of sulphur mustard during the Second World War showed suppression of their lymphatic systems.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 11,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
              
              },
              { index:13, 
               
                  author: $scope.userId,
                  text: 'This might indicate a role for sulphur mustard in the treatment of lymphoma.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 12,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
              
              },
              { index: 14, 
                
                  author: $scope.userId,
                  text: 'Experiments',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'node',
                  on: 13,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index:15, 
               
                  author: $scope.userId,
                  text: 'Mice with lymphoma were exposed to nitrogen mustard.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 14,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  onBlank: true
              
              },
              { index: 16, 
               
                  author: 'ddd',
                  text: "We might expect a deterioration in the test subjects' condition.",
                  dialogueText: function() {
                                  return this.text;
                                },
                  
                  dialogueSide: false,
                  type: 'negation',
                  code: '2A',
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 15,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
              
              },
              { index:17, 
               
                  author: $scope.userId,
                  text: 'Rapid regression of tumors occurred, with less of an effect each subsequent administration.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 16,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
                  
              },
              { index:18, 
               
                  author: $scope.userId,
                  text: 'The mice lived an unusually long time versus experimental controls.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 17,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
              },
            ];



            $scope.preDefinedPoints = [
              { index: 0, 
                
                  author: $scope.userId,
                  text: 'Position and time are relative concepts dependent on the frame of reference of observers.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  step: undefined,
                  which: 'theBlank',
                  on: undefined,
                  its: undefined,
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                  
                
              },
              { index: 1, 
               
                  author: 'aaa',
                  text: 'This cannot be the case, as there is an absolute time as one can determine by keeping one clock stationary and putting another on a ship and then returning, finding that the times agree.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 0,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
             
              },
              { index: 2, 
                
                  author: $scope.userId,
                  text: 'While Newtonian physics provides a good approximation, when clocks approach the speed of light, they will not agree with stationary clocks on how much time has elapsed.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: true,
                  which: 'item',
                  on: 1,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
                
              },
              { index: 3, 
                
                  author: $scope.userId,
                  text: 'This discrepancy arises because light propagates at a constant but finite speed in a vacuum, irrespective of the motion of the observer or the source of light.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'item',
                  on: 2,
                  its: 'bottom',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 4, 
                
                  author: $scope.userId,
                  text: 'Newtonian physics needs to be corrected to account for recent experiments casting doubt upon the existence of a luminiferous ether.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'item',
                  on: 0,
                  its: 'top',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 5, 
               
                  author: 'bbb',
                  text: 'Experiments must be run using clocks with greater precision than we currently have.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 2,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
              
              },
              { index: 6, 
                
                  author: $scope.userId,
                  text: 'This paper proposes a revision to Newtonian physics.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'item',
                  on: 4,
                  its: 'left',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 7, 
               
                  author: 'ccc',
                  text: 'Does this hold for all observers? What about accelerating ones?',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 2,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
              
              },
              { index: 8, 
               
                  author: $scope.userId,
                  text: 'Adjusting Position and Time Measurements for the Fixed Speed of Light',
                  dialogueText: function() {
                                  return this.text;
                                },
                  
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'node',
                  on: 6,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
              
              },
              { index: 9, 
               
                  author: $scope.userId,
                  text: 'More accurate measurements of objects moving at speeds close to that of light can be achieved using the Lorentz transformation.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 8,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  onBlank: true
              
              },
              { index: 10, 
               
                  author: 'aaa',
                  text: 'This flies in the face of classical electrodynamics as well - can these be systematically revised too?',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 6,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
              
              },
              { index: 11, 
               
                  author: $scope.userId,
                  text: 'Lengths may be contracted and time expanded by means of this additional term.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 9,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
              
              },

            ];

            $scope.toyota = [
              // Toyota Production System
              { index: 0, 
                
                  author: $scope.userId,
                  text: 'Manufacturers in Japan might improve competitiveness by embracing continuous process improvement.',
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  step: undefined,
                  which: 'theBlank',
                  on: undefined,
                  its: undefined,
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                  
                
              },
              { index: 1, 
                  // If that happens, production will drop and the reconstruction of the Japanese economy will be significantly delayed.
                  author: 'aaa',
                  text: "そんなことをすれば生産が低下し、日本経済の再建が大幅に遅れることになる。",
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 0,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
             
              },
              { index: 2, 
                
                  author: $scope.userId,
                  text: "Japan's need to trade for the resources to fuel its manufacturing make the prizing of high-volume production risky once domestic needs are eventually met.",
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: true,
                  which: 'item',
                  on: 1,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition',
                  messaged: true
                
              },
              
              { index: 3, 
                  // Improving Processes at Toyota
                  author: $scope.userId,
                  text: 'トヨタのプロセス改善',
                  dialogueText: function() {
                                  return this.text;
                                },
                  
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'node',
                  on: 2,
                  its: 'self',
                  typeTime: 6000,
                  noClick: false, 
                  action: 'proposition'
              
              },
              { index: 4, 
                  //    トヨタは品質向上と無駄削減に取り組むべきだ。
                  author: $scope.userId,
                  text: "Toyota should undertake an initiative to improve quality and reduce waste.",
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                      which: 'item',
                      on: 3,
                      its: 'self',
                      typeTime: 3000,
                      noClick: false, 
                      action: 'proposition',
                      onBlank: true
                
              },
              { index: 5, 
                  //    これはトヨタ自動車のブランドロイヤルティを構築する上で大いに役立つだろう。
                  author: $scope.userId,
                  text: "This would go a long way in building brand loyalty for Toyota automobiles.",
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'item',
                  on: 4,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              { index: 6, 
                  //    トヨタは外国で成功しているプロセスを採用できるでしょうか?
                  author: 'bbb',
                  text: "Can Toyota adopt a process that is used with success in a foreign country?",
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'negation',
                  code: '2A',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),
                  
                  which: 'item',
                  on: 4,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
              
              },
              { index: 7, 
                  //  同社はロッキード工場での米国航空機組み立てから教訓を学ぶことができるだろう。
                  author: $scope.userId,
                  text: "The company could learn lessons from American aircraft assembly at the Lockheed plant.",
                  dialogueText: function() {
                                  return this.text;
                                },
                  type: 'assertion',
                  dialogueSide: false,
                  // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
                  // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
                  // of: (prep.of ? prep.of : undefined),

                  which: 'item',
                  on: 6,
                  its: 'self',
                  typeTime: 3000,
                  noClick: false, 
                  action: 'proposition'
                
              },
              // { index: 8, 
              //     //  他の部品にボトルネックが発生すると、余分な部品が溜まってしまい、効率が下がってしまいます。
              //     author: $scope.userId,
              //     text: "We are losing efficiency by having excess parts accumulate when bottlenecks appear for other parts.",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'assertion',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),

              //     which: 'item',
              //     on: 7,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition'
                
              // },
              // { index: 9, 
              //     //    ロッキードのプロセスをどのように再現できるでしょうか?
              //     author: 'ccc',
              //     text: "How can we replicate Lockheed's process?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 7,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition'
              
              // },
              // { index: 10, 
              //     // これにより、月の初めに生産が遅れ、後半に追いつき生産が行われ、必死の生産ペースで欠陥が発生する原因になっているのでしょうか?   
              //     author: 'aaa',
              //     text: "Is this causing slow production early in the month, and catch-up production in the later part where the frantic pace of production causes defects?",
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 8,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition'
              
              // },
              // { index: 10, 
              //     // The needed basic parts could be machined for each component part, and a worksheet designed so that the assembler can  
              //     author: $scope.userId,
              //     text: 'Adjusting Position and Time Measurements for the Fixed Speed of Light',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
                  
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'node',
              //     on: 6,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition'
              
              // },
              // { index: 9, 
               
              //     author: $scope.userId,
              //     text: 'More accurate measurements of objects moving at speeds close to that of light can be achieved using the Lorentz transformation.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
                  
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 8,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              //     onBlank: true
              
              // },
              // { index: 10, 
               
              //     author: 'aaa',
              //     text: 'This flies in the face of classical electrodynamics as well - can these be systematically revised too?',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
              //     type: 'negation',
              //     code: '2A',
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 6,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition'
              
              // },
              // { index: 11, 
               
              //     author: $scope.userId,
              //     text: 'Lengths may be contracted and time expanded by means of this additional term.',
              //     dialogueText: function() {
              //                     return this.text;
              //                   },
                  
              //     dialogueSide: false,
              //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
              //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
              //     // of: (prep.of ? prep.of : undefined),
                  
              //     which: 'item',
              //     on: 9,
              //     its: 'self',
              //     typeTime: 3000,
              //     noClick: false, 
              //     action: 'proposition',
              
              // },

            ];

            
             
             // $scope.preDefinedPoints = $scope.geocentrism;
              // $scope.preDefinedPoints = $scope.dawnOfChemotherapy;
              // $scope.preDefinedPoints = $scope.toyota;
              // $scope.preDefinedPoints = $scope.listOfLethalities;
              // $scope.preDefinedPoints = $scope.coinbase;
              // $scope.preDefinedPoints = $scope.nodeAdd;




            $scope.simulateUser(0, $scope.coinbase, 3000);
            $scope.simulateUser(0, $scope.coinbase2);
            // $scope.simulateUser(0, $scope.coinbase3);
          
          
        }, 5000);
        }



        
        function setCursorPosition(element) {
          var range = document.createRange();
          var selection = window.getSelection();
          var lastChild = element.lastChild;

          range.setStart(lastChild, lastChild.length);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }



        function populateElementWithText(text, id, messageFlag, nodeFlag, theStep, authorNumber) {
          console.log("Id populating: ", id)
          console.log("Well the text: ", text)
          if (!messageFlag){
            var element = document.getElementById(id);
          } else {
            var element = document.getElementById('input' + id);
          }
          
          if (!element){
            $scope.$apply(function () {
             // setTimeout(function () {
              if (messageFlag){
                 element = document.getElementById('input'+id);
                console.log("Message hmmmm: ", element)
                // }, 0);
              } else if (!messageFlag){
                element = document.getElementById(id);
                console.log("Element hmmmm: ", element)
                // }, 0);
              }
              
            });
          }
          let index = 0;
          if (element){
            element.textContent = '';
          }
          
          console.log ("BEFORE THE INTERVAL")
          const intervalId = setInterval(() => {
            
            
            
            $scope.$apply(function () {
             setTimeout(function () {

              if (Math.random() < 0.001 && index > 0 && false) {
                // Simulate a backspace by removing the last character
                element.textContent = element.textContent.slice(0, -1);
                index--;
                if (theStep.its){
                  if (theStep.its === 'left'){
                    $scope.inputs['left'+id] = element.textContent;
                  }
                }
                
                $scope.inputs['remark'+id] = element.textContent;
                $scope.inputs['top'+id] = element.textContent;
                $scope.inputs['bottom'+id] = element.textContent;
                
                if (messageFlag){
                  $scope.inputs.chatProposition = element.textContent;
                } else {
                  $scope.inputs[id] = element.textContent;
                }
              } else {
                element.textContent += text[index];
                index++;
                
                $scope.inputs['remark'+id] = element.textContent;
                $scope.inputs['top'+id] = element.textContent;
                $scope.inputs['bottom'+id] = element.textContent;
                
                if (theStep.nodeAdd){
                  $scope.inputs.newSectionTitle = element.textContent;
                }
                if (theStep.its){
                  if (theStep.its === 'left'){
                    $scope.inputs['left'+id] = element.textContent;
                  }
                }
                if (messageFlag){
                  

                  $scope.inputs.chatProposition = angular.copy(element.textContent);
                  $scope.scrollMessagesToBottom();
                  
                } else {
                  var textElement = document.getElementById("thetext");
                  textElement.scrollTop = textElement.scrollHeight;
                  $scope.inputs[id] = element.textContent;
                }
                // console.log("Element: ", element.textContent)
                // console.log("Chat prop osition: ", $scope.inputs.chatProposition)
              }

              setCursorPosition(element); // Set cursor position to the end

              if (index === text.length) {
                if (!nodeFlag){
                  setTimeout(function () {
                    clearInterval(intervalId);
                    console.log("ABOUT TO TOP PRESS with text: ", text)
                    console.log("ABOUT TO TOP PRESS author number: ", authorNumber)
                    console.log("SELECTED NODE HERE: ", $scope.selectedNode.nodeId)
                    simulateReturnKeyPress(element, text, authorNumber);
                   }, 10);
                } else {
                  setTimeout(function () {
                    clearInterval(intervalId);
                    console.log("ABOUT TO BOTTOM PRESS")
                    simulateReturnKeyPress(element, text+':', authorNumber);
                   }, 10);
                }
                
              }
              if (messageFlag){
                var thisElement = document.getElementById('input'+id);
                setTimeout(function () {
                  thisElement.style.height = 'auto';
                  thisElement.style.height = thisElement.scrollHeight + 'px';
                }, 20);
              }
              // Set cursor position to the end of the text input
              // element.setSelectionRange(index, index);
              // element.focus();
              }, 0);
            });
            
          }, getRandomInterval(30)); // Adjust the base interval duration (in milliseconds)

          function getRandomInterval(baseInterval) {
            const minInterval = baseInterval * 0.75;
            const maxInterval = baseInterval * 1.25;
            return Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
          }

          function simulateReturnKeyPress(element, text, authorNumber) {
            console.log("That text: ", text)
            const event = new Event('keyup', { bubbles: false, cancelable: true });
              event.key = 'Enter';
              event.keyCode = 13;
              event.which = 13;
              event.authorNumber = authorNumber;
              $scope.temporaryText = text;

            $scope.$apply(function () {
             setTimeout(function () {
               // console.log("User actions: ", angular.copy($scope.userActions))
               console.log("Author number before the dispatch: ", event.authorNumber)
               element.dispatchEvent(event);
               // console.log("That event: ", event)
               $scope.temporaryText = '';



               // if ($scope.userActions.length !== 0){
               //  console.log("No length")
               //  if (!$scope.preDefinedPoints[$scope.userActions.length].code){
               //    console.log("no code")
               //   element.dispatchEvent(event);
               //   console.log("Else event: ", event)
               //   $scope.temporaryText = '';
               //  } else {
               //   console.log("Negationiy randomness")
               //   var randomPercentage = Math.random() * 0.6 - 0.3; // Random number between -0.3 and 0.3

               //       // Calculate the delay based on the random percentage
               //   var delay = 4000 + (4000 * randomPercentage); // Four seconds (4000ms) with random deviation

               //       // Execute the action after the calculated delay
               //   $timeout(function() {
               //         // Your action goes here
               //     element.dispatchEvent(event);
               //     console.log("That event: ", event)
               //     $scope.temporaryText = '';
               //   }, delay);

               //  }
            
               // } else {
               //  element.dispatchEvent(event);
               //  console.log("Else event: ", event)
               //  $scope.temporaryText = '';
               // }



               
              }, 500);
            });
            

            // console.log("About to press")
            // focusFactory(id)
            // const eventKeyDown = new KeyboardEvent('keydown', {
            //   key: 'Enter',
            //   code: 'Enter',
            //   which: 13,
            //   keyCode: 13,
            //   bubbles: false
            // });
            // const eventKeyUp = new KeyboardEvent('keyup', {
            //   key: 'Enter',
            //   code: 'Enter',
            //   which: 13,
            //   keyCode: 13,
            //   bubbles: false
            // });
            // setTimeout(function () {
            //   console.log("Element pressing: ", element)
            //   element.dispatchEvent(eventKeyDown);
            //   element.dispatchEvent(eventKeyUp);
            // }, 20);
            
          }
        }









        // Simulating a user
        $scope.simulateUser = function(index, script, initialDelay) {


          setTimeout(function() {
            console.log("A simulate user. Index: ", index, " Script: ", script)
            // simulate script
            // if (index > 0 && $scope.preDefinedPoints[index-1])
            var theStep = script.sequence[index];
            var theOn = theStep.on;
            var theOnText = theStep.text;
            if (!theStep.messaged){
              setTimeout(function () {
                $scope.$apply(function () {
                  $scope.hasChatFocusId = '';
                });
              }, 0);
            }
            if (theStep.action ==='proposition'){







              if (theStep.author === $scope.userId){
                console.log("userid prop")
                if (theStep.which === 'theBlank'){
                  for (var i = 0; i < $scope.data[0].nodes[0].paragraphs.length; i++){
                    for (var j = 0; i < $scope.data[0].nodes[0].paragraphs[i].propositions.length; j++){
                      if ($scope.data[0].nodes[0].paragraphs[i].propositions[j].type === 'blank'){
                        var thisHereId = $scope.data[0].nodes[0].paragraphs[i].propositions[j].id;
                        setTimeout(function () {
                          document.getElementById(thisHereId).click();
                        }, 20);
                        break;
                      }
                    }
                  }
                  setTimeout(function () {
                    populateElementWithText( script.sequence[index].text,thisHereId, null, null, theStep, script.authorNumber)
                  }, 2000);
                  
                } else if (theStep.which === 'aBlank'){
                  var theNodeTopic = theOn.text;
                  for (var h = 0; h < $scope.data[0].nodes.length; h++){

                    if ($scope.data[0].nodes[h].topic.slice(0, 15) === script.sequence[theOn].text.slice(0, 15)){
                      var thisHereId = $scope.data[0].nodes[h].paragraphs[0].propositions[0].id;
                      console.log("Got a this here id: ", thisHereId)
                      setTimeout(function () {
                        document.getElementById(thisHereId).click();
                      }, 20);
                      break;
                    }
                  }
                  setTimeout(function () {
                    populateElementWithText( script.sequence[index].text,thisHereId, null, null, theStep, script.authorNumber)
                  }, 2000);
                  
                } else if (theStep.which === 'node'){
                  if (theStep.nodeAdd){
                    for (var h = 0; h < $scope.data[0].nodes.length; h++){
                      for (var i = 0; i < $scope.data[0].nodes[h].paragraphs.length; i++){
                        for (var j = 0; j < $scope.data[0].nodes[h].paragraphs[i].propositions.length; j++){
                          console.log("H-I-J: ", h, " ", i, " ", j)
                          if ( (!hasAJ &&
                            script.sequence[theOn].text.slice(0, 15) === 
                            $scope.data[0].nodes[h].paragraphs[i].propositions[j].text.slice(0, 15)) ||
                             (!hasAJ &&
                            script.sequence[theOn].text.slice(0, 15) === 
                            $scope.data[0].nodes[h].paragraphs[i].propositions[j].text.slice(0, 15))){
                              var thisH = angular.copy(h)
                              var thisI = angular.copy(i)
                              var thisJ = angular.copy(j)
                              var hasAJ = true;
                              var thisHereNodeId = $scope.data[0].nodes[h].nodeId
                              
                              setTimeout(function () {
                                document.getElementById('bottom' + thisHereNodeId).click();
                              }, 20);
                              break;
                          }
                        }
                      }
                    }
                    
                    // populate with text
                    setTimeout(function () {
                      console.log("Element inside: ", document.getElementById($scope.bottomNodeAdderId))
                      populateElementWithText( script.sequence[index].text,angular.copy($scope.bottomNodeAdderId), null, true, theStep, script.authorNumber)
                    }, 2000);


                  } else {
                      for (var h = 0; h < $scope.data[0].nodes.length; h++){
                        for (var i = 0; i < $scope.data[0].nodes[h].paragraphs.length; i++){
                          for (var j = 0; j < $scope.data[0].nodes[h].paragraphs[i].propositions.length; j++){
                            console.log("H-I-J: ", h, " ", i, " ", j)
                            if ( (!hasAJ &&
                              script.sequence[theOn].text.slice(0, 15) === 
                              $scope.data[0].nodes[h].paragraphs[i].propositions[j].text.slice(0, 15)) ||
                               (!hasAJ &&
                              script.sequence[theOn].text.slice(0, 15) === 
                              $scope.data[0].nodes[h].paragraphs[i].propositions[j].text.slice(0, 15))){
                                var thisHereId = $scope.data[0].nodes[h].paragraphs[i].propositions[j].id;    
                                var thisH = angular.copy(h)
                                var thisI = angular.copy(i)
                                var thisJ = angular.copy(j)
                                var hasAJ = true;
                                setTimeout(function () {
                                  document.getElementById(thisHereId).click();
                                }, 20);
                                break;
                            }
                          }
                        }
                      }
                    setTimeout(function () {
                      populateElementWithText( script.sequence[index].text,thisHereId, null, true, theStep, script.authorNumber)
                    }, 2000);
                  }


                } else if (theStep.which === 'item'){
                  console.log("An item")
                  for (var yourItemH = 0; yourItemH < $scope.data[0].nodes.length; yourItemH++){
                    // console.log("H: ", angular.copy(yourItemH))
                    // console.log("The H node: ", $scope.data[0].nodes[yourItemH])
                    for (var yourItemI = 0; yourItemI < $scope.data[0].nodes[yourItemH].paragraphs.length; yourItemI++){

                      // console.log("I: ", angular.copy(yourItemI))
                      // console.log("The I paragraph: ", $scope.data[0].nodes[yourItemH].paragraphs[yourItemI])
                      // console.log("That j but on the paragraph: ", $scope.data[0].nodes[yourItemH].paragraphs[yourItemI].propositions[0])
                      for (var yourItemJ = 0; yourItemJ < $scope.data[0].nodes[yourItemH].paragraphs[yourItemI].propositions.length; yourItemJ++){

                        // console.log("J is: ", angular.copy(yourItemJ))
                        // console.log("That j: ", $scope.data[0].nodes[yourItemH].paragraphs[yourItemI].propositions[yourItemJ])

                        // console.log("That js remarks: ", $scope.data[0].nodes[yourItemH].paragraphs[yourItemI].propositions[yourItemJ].remarks)
                        for (var yourItemK = 0; yourItemK < $scope.data[0].nodes[yourItemH].paragraphs[yourItemI].propositions[yourItemJ].remarks.length; yourItemK++){
                          // console.log("Will not trigger this")
                          if (!hasAK &&
                          script.sequence[theOn].text.slice(0, 15) === 
                          $scope.data[0].nodes[yourItemH].paragraphs[yourItemI].propositions[yourItemJ].remarks[yourItemK].text.slice(0, 15)){
                            
                            var thisH = angular.copy(yourItemH)
                            var thisI = angular.copy(yourItemI)
                            var thisJ = angular.copy(yourItemJ)
                            var thisK = angular.copy(yourItemK)
                            var thisHereId = $scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ].remarks[thisK].id;
                            
                            
                            var hasAK = true;
                            console.log("This here id: ", thisHereId)
                            if (hasAK){
                              if (theStep.messaged){
                                console.log("Its messaged")
                                setTimeout(function () {
                                  document.getElementById('message'+thisHereId).click();
                                  document.getElementById('dialoguelist').scrollTop = document.getElementById('dialoguelist').scrollHeight;
                                }, 20);

                                setTimeout(function () {
                                  $scope.selectedProposition = $scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ].remarks[thisK];
                                  populateElementWithText(script.sequence[index].text,thisHereId, true, null, theStep, script.authorNumber)
                                  console.log("The this here id: ", angular.copy(thisHereId))
                                  console.log("The currently selected prop: ", angular.copy($scope.selectedProposition.text))
                                  // break;
                                }, 2000);
                              } else {
                                console.log("NOT messaged")
                                // for rejoinders
                                // need to write for 2Bs
                                setTimeout(function () {
                                  $scope.$apply(function () {
                                    
                                    $scope.toggleRemarksExpansion($scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ])
                                    $scope.selectedNode = $scope.data[0].nodes[thisH];
                                    $scope.selectedProposition = $scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ].remarks[thisK];
                                    
                                  });
                                }, 0);
                                          
                                setTimeout(function () {
                                  console.log("STILL THIS HERE ID: ", thisHereId)
                                  document.getElementById('proposition'+thisHereId).click();
                                  document.getElementById('thetext').scrollTop = document.getElementById('thetext').scrollHeight;

                                }, 20);
                                setTimeout(function () {
                                  console.log("Now the selected node is: ", angular.copy($scope.selectedNode.nodeId))
                                  $scope.selectedProposition = $scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ].remarks[thisK];
                                  populateElementWithText(script.sequence[index].text,thisHereId, null, null, theStep, script.authorNumber)
                                  
                                  
                                }, 2000);
                                break;
                              }
                              
                            }    

                          }
                        }
                      }
                    }
                  }
                  // non-k author props
                  if (hasAK){
                    return;
                  }



                  // it does everything except write the blank replacement down




                  console.log("Non k")
                  for (var h = 0; h < $scope.data[0].nodes.length; h++){
                    console.log("That nodes topic USERID: ", $scope.data[0].nodes[h].topic)
                    console.log("That points on USERID: ", script.sequence[theOn].text.slice(0, 15))
                    console.log("That nodes blank USERID: ", theStep.onBlank)
                    if ($scope.data[0].nodes[h].topic.slice(0, 15) === script.sequence[theOn].text.slice(0, 15) &&
                      theStep.onBlank){
                      console.log("Normal blank")
                      for (var i = 0; i < $scope.data[0].nodes[h].paragraphs.length; i++){
                        
                        for (var j = 0; j < $scope.data[0].nodes[h].paragraphs[i].propositions.length; j++){
                          if ($scope.data[0].nodes[h].paragraphs[i].propositions[j].type === 'blank'){
                            var thisHereId = $scope.data[0].nodes[h].paragraphs[i].propositions[j].id;
                            var thisH = angular.copy(h)
                            var thisI = angular.copy(i)
                            var thisJ = angular.copy(j)
                            var hasAJ = true;
                          }
                        }
                      }
                      // setTimeout(function () {
                      //   $scope.$apply(function () {
                         
                      //     $scope.toggleRemarksExpansion($scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ])
                      //   });
                      // }, 0);
                              
                      setTimeout(function () {
                        document.getElementById('proposition'+thisHereId).click();
                      }, 20);
                      setTimeout(function () {
                        populateElementWithText(script.sequence[index].text,thisHereId,null, null, theStep, script.authorNumber)
                      
                        
                      }, 2000);
                      break;
                    }
                   
                    for (var i = 0; i < $scope.data[0].nodes[h].paragraphs.length; i++){
                      
                      for (var j = 0; j < $scope.data[0].nodes[h].paragraphs[i].propositions.length; j++){
                        console.log("H-I-J: ", h, " ", i, " ", j)
                        console.log("First: ", script.sequence[theOn].text.slice(0, 15))
                        console.log("Second ", $scope.data[0].nodes[h].paragraphs[i].propositions[j].text)
                        if ( (!hasAJ &&
                        script.sequence[theOn].text.slice(0, 15) === 
                        $scope.data[0].nodes[h].paragraphs[i].propositions[j].text.slice(0, 15)) ||
                          (!hasAJ &&
                        script.sequence[theOn].text.slice(0, 15) === 
                        $scope.data[0].nodes[h].paragraphs[i].propositions[j].text.slice(0, 15))){
                          var thisHereId = $scope.data[0].nodes[h].paragraphs[i].propositions[j].id;
                          
                          var thisH = angular.copy(h)
                          var thisI = angular.copy(i)
                          var thisJ = angular.copy(j)
                          var hasAJ = true;
                          console.log("That id id: ", thisHereId)
                          console.log("The step its ", theStep.its)
                          if (theStep.its === 'top'){
                            console.log("Its top")
                            // $scope.$apply(function () {
                            $scope.data[0].nodes[thisH].paragraphs[thisI].topMouseOver = true;
                            $scope.data[0].nodes[thisH].paragraphs[thisI].topAdd = true;
                            $scope.makeTopAppear($scope.data[0].nodes[thisH].paragraphs[thisI]);
                              setTimeout(function () {
                                document.getElementById('top'+$scope.data[0].nodes[thisH].paragraphs[thisI].paragraphId)
                                .click();
                              }, 40);
                            // });
                            // setTimeout(function () {
                            //   console.log("")
                            //   document.getElementById('top'+$scope.data[0].nodes[thisH].paragraphs[thisI].paragraphId).click();
                            // }, 20);
                            
                            // $scope.$apply(function () {
                              setTimeout(function () {
                                populateElementWithText(script.sequence[index].text, 
                                  'top'+$scope.data[0].nodes[thisH].paragraphs[thisI].paragraphId, null, null, theStep, script)
                               
                              }, 2000);
                            // });
                            break;
                          } else if (theStep.its === 'bottom'){
                            console.log("Its bottom")
                            // $scope.$apply(function () {
                              setTimeout(function () {
                                console.log("I")
                                document.getElementById('bottomadder'+$scope.data[0].nodes[thisH].paragraphs[thisI].paragraphId).click();
                                document.getElementById('thetext').scrollTop = document.getElementById('thetext').scrollHeight;
                              }, 0);
                            // });
                            // setTimeout(function () {
                            //   console.log("II")
                            //   document.getElementById($scope.data[0].nodes[thisH].paragraphs[thisI].paragraphId).click();
                            // }, 1000);
                            // $scope.$apply(function () {
                              setTimeout(function () {
                                console.log("III")
                                populateElementWithText(script.sequence[index].text, $scope.data[0].nodes[thisH].paragraphs[thisI].paragraphId, null, null, theStep, script.authorNumber)
                             

                              }, 2000);
                              break;
                            // });
                            
                          } else if (theStep.its === 'left'){
                              // $scope.$apply(function () {
                                $scope.data[0].nodes[thisH].paragraphs[thisI].leftAdd = true;
                                // setTimeout(function () {
                                //   populateElementWithText($scope.preDefinedPoints[index].text, 'left'+ $scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ].id)
                                //   console.log("Got an id")

                                // }, 30);
                                // break;
                              // });
                            // console.log("Before: ", document.getElementById('left'+$scope.data[0].nodes[thisH].paragraphs[thisI].paragraphId))
                              setTimeout(function () {
                                $scope.data[0].nodes[thisH].paragraphs[thisI].leftAdd = true;
                                document.getElementById('left'+$scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ].id).click();
                              }, 20);
                            // });
                            // setTimeout(function () {
                            //   document.getElementById($scope.data[0].nodes[thisH].paragraphs[thisI].paragraphId).click();
                            // }, 20);



                            // $scope.$apply(function () {
                              setTimeout(function () {
                                populateElementWithText(script.sequence[index].text, 'left'+ $scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ].id, null, null, theStep, script.authorNumber)
                               

                              }, 2000);
                              break;
                            // });
                          } else if (theStep.its === 'self') {     

                            if (theStep.messaged){
                              console.log("Its messaged")
                              setTimeout(function () {
                                document.getElementById('message'+thisHereId).click();
                                document.getElementById('dialoguelist').scrollTop = document.getElementById('dialoguelist').scrollHeight;
                              }, 20);

                              setTimeout(function () {
                                populateElementWithText(script.sequence[index].text,thisHereId, true, null, theStep, script.authorNumber)
                                
                                // break;
                              }, 2000);
                              break;
                            } else {
                              console.log("Self")
                              // if (!theStep.noClick){
                              //   console.log("Not clicked")
                              //   setTimeout(function () {
                              //     $scope.$apply(function () {
                                   
                              //       $scope.toggleRemarksExpansion($scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ])
                              //     });
                              //   }, 0);
                              // }
                              
                                      
                              setTimeout(function () {
                                document.getElementById('proposition'+thisHereId).click();
                              }, 20);
                              setTimeout(function () {
                                populateElementWithText(script.sequence[index].text,thisHereId,null, null, theStep, script.authorNumber)
                              
                                
                              }, 2000);
                              break;
                            }
                            

                            
                            
                          }
                          // var hasAK = true;
                          
                          // setTimeout(function () {
                          //   $scope.$apply(function () {
                          //     console.log("H: ", thisH)
                          //     $scope.toggleRemarksExpansion($scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ])
                          //   });
                          // }, 0);          
                          // setTimeout(function () {
                          //   document.getElementById('proposition'+thisHereId).click();
                          // }, 20);
                          // setTimeout(function () {
                          //   populateElementWithText($scope.preDefinedPoints[index].text,thisHereId)
                          //   console.log("Got an id")
                          //   // hasAK = false;
                          // }, 20);
                          // break; 
                        }
                      }
                    }
                  }
                    
                  // props by the author that aren't on remarks by virtue of not getting a k
                  
                }







              } else {
                console.log("some other persons prop: ", theStep.text)
                // reviewer propositions
                var theCode = theStep.code;
                if (theCode === '2A'){
                
                  for (var h = 0; h < $scope.data[0].nodes.length; h++){
              
                    for (var i = 0; i < $scope.data[0].nodes[h].paragraphs.length; i++){
                    
                      for (var j = 0; j < $scope.data[0].nodes[h].paragraphs[i].propositions.length; j++){
                     
                        if (
                        script.sequence[theOn].text.slice(0, 15) === 
                        $scope.data[0].nodes[h].paragraphs[i].propositions[j].text.slice(0, 15)){
                          var thisHereId = $scope.data[0].nodes[h].paragraphs[i].propositions[j].id;
                          console.log("About to reviewer prop")
                          console.log("With 2a script: ", angular.copy(script.authorNumber))
                          $scope.prepProposition(theStep.text, $scope.data[0].nodes[h], 
                          $scope.data[0].nodes[h].paragraphs[i], $scope.data[0].nodes[h].paragraphs[i].propositions[j], 
                          null, null, theStep.author, theCode, script.authorNumber);


                          break;
                        }  
                      }
                    }
                  } 
                } else if (theCode === '2B'){
                  
                  for (var h = 0; h < $scope.data[0].nodes.length; h++){
                    
                    for (var i = 0; i < $scope.data[0].nodes[h].paragraphs.length; i++){
                     
                      for (var j = 0; j < $scope.data[0].nodes[h].paragraphs[i].propositions.length; j++){
                        
                        for (var k = 0; k < $scope.data[0].nodes[h].paragraphs[i].propositions[j].remarks.length; k++){
                         
                          if (
                          script.sequence[theOn].text.slice(0, 15) === 
                          $scope.data[0].nodes[h].paragraphs[i].propositions[j].remarks[k].text.slice(0, 15)){
                            var thisHereId = $scope.data[0].nodes[h].paragraphs[i].propositions[j].remarks[k].id;
                            console.log("About to 2b prop")
                            $scope.prepProposition(theStep.text, $scope.data[0].nodes[h], 
                            $scope.data[0].nodes[h].paragraphs[i], $scope.data[0].nodes[h].paragraphs[i].propositions[j], 
                            null, null, theStep.author, theCode, script.authorNumber);


                            break;
                          }
                        }
                      }
                    }
                  }          
                } else {
                  if (theStep.which === 'theBlank'){
                    for (var i = 0; i < $scope.data[0].nodes[0].paragraphs.length; i++){
                      for (var j = 0; i < $scope.data[0].nodes[0].paragraphs[i].propositions.length; j++){
                        if ($scope.data[0].nodes[0].paragraphs[i].propositions[j].type === 'blank'){
                          // var thisHereId = $scope.data[0].nodes[0].paragraphs[i].propositions[j];
                          console.log("About to other author theblank")
                          $scope.prepProposition(theStep.text, $scope.data[0].nodes[0], 
                          $scope.data[0].nodes[0].paragraphs[i], $scope.data[0].nodes[0].paragraphs[i].propositions[j], 
                          null, null, theStep.author, theCode, script.authorNumber);


                          break;
                        }
                      } 
                    }

                  } else if (theStep.onBlank && !theStep.which){
                    console.log("Other author ablank")
                    var theNodeTopic = theOn.text;
                    for (var h = 0; h < $scope.data[0].nodes.length; h++){
                      // console.log("Topic: ", $scope.data[0].nodes[h].topic)
                      // console.log("The Node Topic: ", $scope.preDefinedPoints[theOn].text)
                      console.log("Primero: ", $scope.data[0].nodes[h].topic.slice(0, 7))
                      console.log("Segundo: ", script.sequence[theOn].text.slice(0, 7))
                      if ($scope.data[0].nodes[h].topic.slice(0, 7) === script.sequence[theOn].text.slice(0, 7)){
                        console.log("Found")
                        // var thisHereId = $scope.data[0].nodes[h].paragraphs[0].propositions[0].id;
                        // console.log("Got a this here id: ", thisHereId)
                        // $scope.prepProposition = function (input, node, paragraph, proposition, event, flag, automatedAuthor, automatedCode, authorNumber, rejoinderMessaged ) {
                        $scope.prepProposition(theStep.text, $scope.data[0].nodes[h], 
                        $scope.data[0].nodes[h].paragraphs[0], null, 
                        null, null, theStep.author, '4', script.authorNumber);
                        break;
                      }
                    }
                  } else {
                    for (var h = 0; h < $scope.data[0].nodes.length; h++){
                    
                      for (var i = 0; i < $scope.data[0].nodes[h].paragraphs.length; i++){
                    
                        for (var j = 0; j < $scope.data[0].nodes[h].paragraphs[i].propositions.length; j++){
                         
                          for (var k = 0; k < $scope.data[0].nodes[h].paragraphs[i].propositions[j].remarks.length; k++){
                            if (!hasAK &&
                            script.sequence[theOn].text.slice(0, 15) === 
                            $scope.data[0].nodes[h].paragraphs[i].propositions[j].remarks[k].text.slice(0, 15)){
                              
                              var thisH = angular.copy(h)
                              var thisI = angular.copy(i)
                              var thisJ = angular.copy(j)
                              var thisK = angular.copy(k)
                              console.log("K working with: ", $scope.data[0].nodes[h].paragraphs[i].propositions[j].remarks[k].text)
                              var thisHereId = $scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ].remarks[thisK].id;
                              
                              
                              var hasAK = true;
                              console.log("This here id: ", thisHereId)
                              if (hasAK){
                                if (theStep.messaged){

                                  $scope.prepProposition(theStep.text, $scope.data[0].nodes[thisH], 
                                  $scope.data[0].nodes[thisH].paragraphs[thisI], $scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ], 
                                  null, null, theStep.author, '3B', script.authorNumber, true, thisHereId);
                                  console.log("Script author number before: ", script.authorNumber)
                                  break;

                                  // console.log("Its messaged")
                                  // setTimeout(function () {
                                  //   document.getElementById('message'+thisHereId).click();
                                  //   document.getElementById('dialoguelist').scrollTop = document.getElementById('dialoguelist').scrollHeight;
                                  // }, 20);

                                  // setTimeout(function () {
                                  //   $scope.selectedProposition = $scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ].remarks[thisK];
                                  //   populateElementWithText(script.sequence[index].text,thisHereId, true, null, theStep, script.authorNumber)
                                  //   console.log("The this here id: ", angular.copy(thisHereId))
                                  //   console.log("The currently selected prop: ", angular.copy($scope.selectedProposition.text))
                                  //   // break;
                                  // }, 2000);
                                } else {
                                  console.log("NOT messaged")
                                  // for rejoinders
                                  // need to write for 2Bs
                                  setTimeout(function () {
                                    $scope.$apply(function () {
                                      
                                      $scope.prepProposition(theStep.text, $scope.data[0].nodes[thisH], 
                                      $scope.data[0].nodes[thisH].paragraphs[thisI], $scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ], 
                                      null, null, theStep.author, '3B', script.authorNumber, false, thisHereId);
                                      
                                    });
                                  }, 0);
                                            

                                  break;
                                }
                                
                              }    

                            }
                          }
                        }
                      }
                    }
                    // non-k author props
                    if (hasAK){
                      return;
                    }

                    for (var h = 0; h < $scope.data[0].nodes.length; h++){
                      console.log("That nodes topic: ", $scope.data[0].nodes[h].topic)
                      console.log("That points on: ", script.sequence[theOn].text.slice(0, 15))
                      console.log("That nodes blank: ", theStep.onBlank)
                      // if ($scope.data[0].nodes[h].topic.slice(0, 15) === script.sequence[theOn].text.slice(0, 15) &&
                      //   theStep.onBlank){
                      //   console.log("Normal blank")
                      //   for (var i = 0; i < $scope.data[0].nodes[h].paragraphs.length; i++){
                          
                      //     for (var j = 0; j < $scope.data[0].nodes[h].paragraphs[i].propositions.length; j++){
                      //       if ($scope.data[0].nodes[h].paragraphs[i].propositions[j].type === 'blank'){
                      //         var thisHereId = $scope.data[0].nodes[h].paragraphs[i].propositions[j].id;
                      //         var thisH = angular.copy(h)
                      //         var thisI = angular.copy(i)
                      //         var thisJ = angular.copy(j)
                      //         var hasAJ = true;
                      //       }
                      //     }
                      //   }
                      //   // setTimeout(function () {
                      //   //   $scope.$apply(function () {
                           
                      //   //     $scope.toggleRemarksExpansion($scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ])
                      //   //   });
                      //   // }, 0);
                                
                      //   setTimeout(function () {
                      //     document.getElementById('proposition'+thisHereId).click();
                      //   }, 20);
                      //   setTimeout(function () {
                      //     populateElementWithText(script.sequence[index].text,thisHereId,null, null, theStep, script.authorNumber)
                        
                          
                      //   }, 2000);
                      //   break;
                      // }
                     
                      for (var i = 0; i < $scope.data[0].nodes[h].paragraphs.length; i++){
                        
                        for (var j = 0; j < $scope.data[0].nodes[h].paragraphs[i].propositions.length; j++){
                          console.log("H-I-J: ", h, " ", i, " ", j)
                          console.log("First: ", script.sequence[theOn].text.slice(0, 15))
                          console.log("Second ", $scope.data[0].nodes[h].paragraphs[i].propositions[j].text)
                          if ( (!hasAJ &&
                          script.sequence[theOn].text.slice(0, 15) === 
                          $scope.data[0].nodes[h].paragraphs[i].propositions[j].text.slice(0, 15)) ||
                            (!hasAJ &&
                          script.sequence[theOn].text.slice(0, 15) === 
                          $scope.data[0].nodes[h].paragraphs[i].propositions[j].text.slice(0, 15))){
                            var thisHereId = $scope.data[0].nodes[h].paragraphs[i].propositions[j].id;
                            
                            var thisH = angular.copy(h)
                            var thisI = angular.copy(i)
                            var thisJ = angular.copy(j)
                            var hasAJ = true;
                            console.log("That id id: ", thisHereId)
                            console.log("That id text: ", $scope.data[0].nodes[h].paragraphs[i].propositions[j].text)
                            console.log("The step its ", theStep.its)
                            if (theStep.its === 'top'){
                              console.log("Its top")
                              // $scope.$apply(function () {
                              // $scope.data[0].nodes[thisH].paragraphs[thisI].topMouseOver = true;
                              // $scope.data[0].nodes[thisH].paragraphs[thisI].topAdd = true;
                              // $scope.makeTopAppear($scope.data[0].nodes[thisH].paragraphs[thisI]);
                              //   setTimeout(function () {
                              //     document.getElementById('top'+$scope.data[0].nodes[thisH].paragraphs[thisI].paragraphId)
                              //     .click();
                              //   }, 40);
                              // });
                              // setTimeout(function () {
                              //   console.log("")
                              //   document.getElementById('top'+$scope.data[0].nodes[thisH].paragraphs[thisI].paragraphId).click();
                              // }, 20);
                              
                              // $scope.$apply(function () {
                                // setTimeout(function () {
                                //   populateElementWithText(script.sequence[index].text, 
                                //     'top'+$scope.data[0].nodes[thisH].paragraphs[thisI].paragraphId, null, null, theStep, script)
                                 
                                // }, 2000);
                              // });
                              // break;
                            } else if (theStep.its === 'bottom'){
                              console.log("Its bottom")
                              $scope.prepProposition(theStep.text, $scope.data[0].nodes[thisH], 
                              $scope.data[0].nodes[thisH].paragraphs[thisI], $scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ], 
                              null, null, theStep.author, '3E', script.authorNumber);
                              // $scope.$apply(function () {
                                // setTimeout(function () {
                                //   console.log("I")
                                //   document.getElementById('bottomadder'+$scope.data[0].nodes[thisH].paragraphs[thisI].paragraphId).click();
                                //   document.getElementById('thetext').scrollTop = document.getElementById('thetext').scrollHeight;
                                // }, 0);
                              // });
                              // setTimeout(function () {
                              //   console.log("II")
                              //   document.getElementById($scope.data[0].nodes[thisH].paragraphs[thisI].paragraphId).click();
                              // }, 1000);
                              // $scope.$apply(function () {
                                // setTimeout(function () {
                                //   console.log("III")
                                //   populateElementWithText(script.sequence[index].text, $scope.data[0].nodes[thisH].paragraphs[thisI].paragraphId, null, null, theStep, script.authorNumber)
                               

                                // }, 2000);
                                // break;
                              // });
                              
                            } else if (theStep.its === 'left'){
                                // $scope.$apply(function () {
                                  // $scope.data[0].nodes[thisH].paragraphs[thisI].leftAdd = true;
                                  // setTimeout(function () {
                                  //   populateElementWithText($scope.preDefinedPoints[index].text, 'left'+ $scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ].id)
                                  //   console.log("Got an id")

                                  // }, 30);
                                  // break;
                                // });
                              // console.log("Before: ", document.getElementById('left'+$scope.data[0].nodes[thisH].paragraphs[thisI].paragraphId))
                                // setTimeout(function () {
                                //   $scope.data[0].nodes[thisH].paragraphs[thisI].leftAdd = true;
                                //   document.getElementById('left'+$scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ].id).click();
                                // }, 20);
                              // });
                              // setTimeout(function () {
                              //   document.getElementById($scope.data[0].nodes[thisH].paragraphs[thisI].paragraphId).click();
                              // }, 20);



                              // $scope.$apply(function () {
                                // setTimeout(function () {
                                //   populateElementWithText(script.sequence[index].text, 'left'+ $scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ].id, null, null, theStep, script.authorNumber)
                                 

                                // }, 2000);
                                // break;
                              // });
                            } else if (theStep.its === 'self') {     

                              if (theStep.messaged){
                                // console.log("Its messaged")
                                // setTimeout(function () {
                                //   document.getElementById('message'+thisHereId).click();
                                //   document.getElementById('dialoguelist').scrollTop = document.getElementById('dialoguelist').scrollHeight;
                                // }, 20);

                                // setTimeout(function () {
                                //   populateElementWithText(script.sequence[index].text,thisHereId, true, null, theStep, script.authorNumber)
                                  
                                //   // break;
                                // }, 2000);
                                // break;
                              } else {
                                console.log("Self non messaged 3G")
                                $scope.prepProposition(theStep.text, $scope.data[0].nodes[thisH], 
                                $scope.data[0].nodes[thisH].paragraphs[thisI], $scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ], 
                                null, null, theStep.author, '3G', script.authorNumber);
                                // if (!theStep.noClick){
                                //   console.log("Not clicked")
                                //   setTimeout(function () {
                                //     $scope.$apply(function () {
                                     
                                //       $scope.toggleRemarksExpansion($scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ])
                                //     });
                                //   }, 0);
                                // }
                                
                                        
                                // setTimeout(function () {
                                //   document.getElementById('proposition'+thisHereId).click();
                                // }, 20);
                                // setTimeout(function () {
                                //   populateElementWithText(script.sequence[index].text,thisHereId,null, null, theStep, script.authorNumber)
                                
                                  
                                // }, 2000);
                                break;
                              }
                              

                              
                              
                            }
                            // var hasAK = true;
                            
                            // setTimeout(function () {
                            //   $scope.$apply(function () {
                            //     console.log("H: ", thisH)
                            //     $scope.toggleRemarksExpansion($scope.data[0].nodes[thisH].paragraphs[thisI].propositions[thisJ])
                            //   });
                            // }, 0);          
                            // setTimeout(function () {
                            //   document.getElementById('proposition'+thisHereId).click();
                            // }, 20);
                            // setTimeout(function () {
                            //   populateElementWithText($scope.preDefinedPoints[index].text,thisHereId)
                            //   console.log("Got an id")
                            //   // hasAK = false;
                            // }, 20);
                            // break; 
                          }
                        }
                      }
                    }
                  }

                    // complete for non author assertions and should have it


                    
                  







                  }   
                }   
            } else if (theStep.action ==='proposition') {
              // vestigial?
              for (var h = 0; h < $scope.data[0].nodes.length; h++){
                
                for (var i = 0; i < $scope.data[0].nodes[h].paragraphs.length; i++){
                 
                  for (var j = 0; j < $scope.data[0].nodes[h].paragraphs[i].propositions.length; j++){
                    
                    for (var k = 0; k < $scope.data[0].nodes[h].paragraphs[i].propositions[j].remarks.length; k++){
                     
                      if (
                      script.sequence[theOn].text.slice(0, 15) === 
                      $scope.data[0].nodes[h].paragraphs[i].propositions[j].remarks[k].text.slice(0, 15)){
                        var thisHereId = $scope.data[0].nodes[h].paragraphs[i].propositions[j].remarks[k].id;
                        console.log("About to other author prop")
                        $scope.prepProposition(theStep.text, $scope.data[0].nodes[h], 
                        $scope.data[0].nodes[h].paragraphs[i], $scope.data[0].nodes[h].paragraphs[i].propositions[j], 
                        null, null, theStep.author, theCode, script.authorNumber);


                        break;
                      }
                    }
                  }
                }
              } 
              //
            }

          }, initialDelay);



          
        }     
      



        // Function to create the automated payload based on the previous payload
        function createAutomatedPayload(previousPayload, prepId) {
          console.log("Previous payload: ", previousPayload)
          // Find the pre-determined values for the current pre-defined point
            const preDeterminedValues = script.find(point => point.index === $scope.userActions.length).payloadData;
            console.log("Predetermined values: ", preDeterminedValues)
            // Extract the required information from the previous payload
            const topic = previousPayload.topic;
            const ofNodeId = previousPayload.ofNodeId;
            const ofParagraphId = previousPayload.ofParagraphId;
            if (preDeterminedValues.code !== '2B') {
              var of = {
                type: previousPayload.type,
                author: previousPayload.author,
                id: previousPayload.id,
                text: previousPayload.text
              }
            } else {
              var of = {
                type: previousPayload.of.type,
                author: previousPayload.of.author,
                id: previousPayload.of.id,
                text: previousPayload.of.text
              }
            }
            
            const id = IdFactory.next();
            const targetNodeId = previousPayload.targetNodeId;
            const targetParagraphId = previousPayload.targetParagraphId;
            if (preDeterminedValues.code === '2B'){
              var afterPropositionId = previousPayload.of.id;
              var afterRemarkId = previousPayload.remarkId;
            } else if (preDeterminedValues.code === '2A'){
              var afterPropositionId = previousPayload.id;
            } else {
              var afterPropositionId = undefined;
            }
            
            const sectionLevel = previousPayload.sectionLevel;
            const sectionNumber = previousPayload.sectionNumber;
            const documentClaimedBy = previousPayload.documentClaimedBy;
            

            //2a
            var previousMessages = previousPayload.messagesSoFar;
            previousMessages.push(prep.id)
            var messagesSoFar = angular.copy(previousMessages);

            //2b
            // prep.previousMessages = angular.copy($scope.selectedProposition.messagesSoFar);
            // prep.previousMessages.pop();
            // prep.id = IdFactory.next();
            // prep.previousMessages.push(prep.id)
            // prep.messagesSoFar = angular.copy(prep.previousMessages);



            // Add any other information you need from the previous payload

            // Create the automated payload with scripted features and populate it with the information from the previous payload and pre-determined values
            let automatedPayload = {
              topic: topic, // Use the id from the previous payload
              ofNodeId: ofNodeId, // Use the id from the previous payload
              ofParagraphId: ofParagraphId, // Use the id from the previous payload
              of: of, // Use the id from the previous payload
              id: id, // Use the id from the previous payload
              targetNodeId: targetNodeId, // Use the id from the previous payload
              targetParagraphId: targetParagraphId, // Use the id from the previous payload
              afterPropositionId: afterPropositionId ? afterPropositionId : undefined,
              sectionLevel: sectionLevel, // Use the id from the previous payload
              sectionNumber: sectionNumber, // Use the id from the previous payload
              documentClaimedBy: documentClaimedBy, // Use the id from the previous payload,
              previousMessages: previousMessages,
              messagesSoFar: messagesSoFar,
              afterRemarkId : afterRemarkId ? afterRemarkId : undefined
            };

            automatedPayload = Object.assign({}, automatedPayload, preDeterminedValues);
              return automatedPayload;
        }

        // Function to send the automated payload out
        function sendAutomatedPayload(automatedPayload) {
          console.log('Sending automated payload')
          setTimeout(function () {
            chatSocket.emit('proposition', automatedPayload.author, automatedPayload, $scope.bookId);
          }, automatedPayload.delay);
        }


        function sendAutomatedDeletion(automatedDeletionPayload) {
          console.log('Sending automated deletion')
          setTimeout(function () {
            chatSocket.emit('deletion', automatedDeletionPayload.author, automatedDeletionPayload, $scope.bookId);
          }, automatedDeletionPayload.delay);
        }



        // $scope.steps = [
        //     {},
        //     { 
        //       author: 'aaa',
        //       text: 'This text you want.',
        //       dialogueText: 'This text you want.',
        //       type: 'negation',
        //       code: '2A',
        //       topic: $scope.getLastFacts('topic'),
        //       dialogueSide: true,
        //       ofNodeId: $scope.steps[0].nodeId,
        //       // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
        //       ofParagraphId: $scope.steps[0].paragraphId,
        //       // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
        //       // of: (prep.of ? prep.of : undefined),
        //       of: {
        //             type: $scope.steps[0].type,
        //             author: $scope.steps[0].author,
        //             id: $scope.steps[0].id,
        //             text: $scope.steps[0].text
        //           },
        //       blankId: IdFactory.next(),
        //       textSide: false,
        //       bookId: $scope.bookId,
        //       nodeId: IdFactory.next(),
        //       paragraphId: IdFactory.next(),
        //       id: prep.id ? prep.id : IdFactory.next(),
        //       remarkId: IdFactory.next(),
        //       dropflag: false,
        //       targetNodeId: $scope.steps[0].nodeId,
        //       targetParagraphId: $scope.steps[0].paragraphId,
        //       afterPropositionId: $scope.steps[0].id,
        //       sectionLevel: $scope.steps[0].sectionLevel,
        //       sectionNumber: $scope.steps[0].sectionNumber,
        //       documentClaimedBy: $scope.data[0].documentClaimedBy,
        //       delay: 5,
        //     },
        // ];
        // $scope.lines = [
        //   { 
        //     author: 'aaa',
        //     text: 'This text you want.',
        //     dialogueText: 'This text you want.',
        //     type: 'negation',
        //     code: '2A',
        //     topic: $scope.steps[0].topic,
        //     dialogueSide: true,
        //     ofNodeId: $scope.steps[0].nodeId,
        //     // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
        //     ofParagraphId: $scope.steps[0].paragraphId,
        //     // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
        //     // of: (prep.of ? prep.of : undefined),
        //     of: {
        //           type: $scope.steps[0].type,
        //           author: $scope.steps[0].author,
        //           id: $scope.steps[0].id,
        //           text: $scope.steps[0].text
        //         },
        //     blankId: IdFactory.next(),
        //     textSide: false,
        //     bookId: $scope.bookId,
        //     nodeId: IdFactory.next(),
        //     paragraphId: IdFactory.next(),
        //     id: prep.id ? prep.id : IdFactory.next(),
        //     remarkId: IdFactory.next(),
        //     dropflag: false,
        //     targetNodeId: $scope.steps[0].nodeId,
        //     targetParagraphId: $scope.steps[0].paragraphId,
        //     afterPropositionId: $scope.steps[0].id,
        //     sectionLevel: $scope.steps[0].sectionLevel,
        //     sectionNumber: $scope.steps[0].sectionNumber,
        //     documentClaimedBy: $scope.data[0].documentClaimedBy,
        //     delay: 5,
        //   }
        //   ]

        

        






        // prep.scriptPayload = {
        //   author: 'aaa',
        //   text: 'This text you want.',
        //   dialogueText: 'This text you want.',
        //   type: 'negation',
        //   code: '2A',
        //   topic: $scope.steps[$scope.step-1].topic,
        //   dialogueSide: true,
        //   ofNodeId: $scope.steps[$scope.step-1].nodeId,
        //   // ofNodeId: (prep.ofNodeId ? prep.ofNodeId : undefined),
        //   ofParagraphId: $scope.steps[$scope.step-1].paragraphId,
        //   // ofParagraphId: (prep.ofParagraphId ? prep.ofParagraphId : undefined),
        //   // of: (prep.of ? prep.of : undefined),
        //   of: {
        //         type: $scope.steps[$scope.step-1].type,
        //         author: $scope.steps[$scope.step-1].author,
        //         id: $scope.steps[$scope.step-1].id,
        //         text: $scope.steps[$scope.step-1].text
        //       },
        //   blankId: IdFactory.next(),
        //   textSide: false,
        //   bookId: $scope.bookId,
        //   nodeId: IdFactory.next(),
        //   paragraphId: IdFactory.next(),
        //   id: prep.id ? prep.id : IdFactory.next(),
        //   remarkId: IdFactory.next(),
        //   dropflag: false,
        //   targetNodeId: $scope.steps[$scope.step-1].nodeId,
        //   targetParagraphId: $scope.steps[$scope.step-1].paragraphId,
        //   afterPropositionId: $scope.steps[$scope.step-1].id,
        //   sectionLevel: $scope.steps[$scope.step-1].sectionLevel,
        //   sectionNumber: $scope.steps[$scope.step-1].sectionNumber,
        //   documentClaimedBy: $scope.data[0].documentClaimedBy
        // };



            
        // $scope.$watch('step', function(newVal, oldVal) {
        //   for (var i = 0; i < $scope.steps.length; i++) {
        //     if (newVal >= i) {
        //       $scope.$eval($scope.steps[i].content);
        //     }
        //   }
        // });
          
      




      $scope.toggleDiagnostics = function () {
        if ($scope.diagnostics){
          $scope.diagnostics = false;
        } else {
          $scope.diagnostics = true;
        }
       
      }

      

      $scope.clearPlaceholder = function (paragraph) {

        // console.log("Clear placeholder")
        // setTimeout(function () {
        //   $scope.$apply(function () {
        //     if (document.getElementById(paragraph.paragraphId)) {
        //       document.getElementById(paragraph.paragraphId).innerHTML = ''
        //     }
            
        //   });

        // }, 20);
        
      }

      $scope.clearPlaceholderTop = function (paragraph) {
        setTimeout(function () {
          $scope.$apply(function () {
            $scope.inputs['top'+paragraph.paragraphId] = '';
            if (document.getElementById('top' + paragraph.paragraphId)) {
              document.getElementById('top' + paragraph.paragraphId).innerHTML = ''
            }
          });

        }, 20);
        
      }

      $scope.topAddFunction = function (node, paragraph) {
       
        console.log("Top add function")
        setTimeout(function () {
          $scope.$apply(function () {
            paragraph.topAdd = true;
            $scope.selectedNode = node;
            $scope.inputs['top'+paragraph.paragraphId] = '';
            $scope.hasTopFocus = paragraph.paragraphId;
            $scope.hasBottomFocus = {};

            if (document.getElementById('top'+paragraph.paragraphId)){
              document.getElementById('top'+paragraph.paragraphId).innerHTML = ''
            }
          });

        }, 20);
        setTimeout(function () {
          //
        }, 30);
        
      }

      $scope.makeTopAppear = function (paragraph) {
        // console.log("Make top appear returning")
        // return;
        setTimeout(function () {
          $scope.$apply(function () {
            
            paragraph.bottomMouseOver = false; 
            paragraph.topMouseOver = true;
            
            // $scope.inputs['top'+paragraph.paragraphId] = '|'
            if (document.getElementById('top'+paragraph.paragraphId)){
              document.getElementById('top'+paragraph.paragraphId).innerHTML = '|'
            }
            document.getElementById('mainview').addEventListener("click", $scope.handleTopClick(paragraph));
            $scope.handling = true;
            
          });

        }, 200);
        // document.getElementById('top'+paragraph.paragraphId).innerHTML = '|'
      }

      $scope.handleTopClick = function (paragraph) {
        // console.log("Handle top click returning")
        // return;
        
        setTimeout(function () {
            document.getElementById('top' + paragraph.paragraphId).click();
          // });

        }, 0);
        
      }

      $scope.removeTopClickHandler = function (paragraph) {
        // console.log(" returning")
        // return;

        setTimeout(function () {
          $scope.$apply(function () {
            $scope.handling = false;
            document.getElementById('top'+paragraph.paragraphId).removeEventListener("click", handleTopClick(paragraph));
          });

        }, 0);
        

      }





      






      $scope.makeItAppear = function (paragraph) {
        
        
        setTimeout(function () {
          $scope.$apply(function () {
            
            paragraph.topMouseOver = false
            $scope.inputs['bottom'+paragraph.paragraphId] = '|'
            if (document.getElementById(paragraph.paragraphId)){
              document.getElementById(paragraph.paragraphId).innerHTML = '|'
            }
            
          });

        }, 20);
        $scope.inputs.bottomProposition = '|';
      }

      $scope.startBottomParagraphAdderTimer = function (paragraph) {
        $scope.isMouseOut = false;
            $scope.timer = $timeout(function() {
              if (!$scope.isMouseOut) {
                paragraph.bottomMouseOver = true; 
                $scope.makeItAppear(paragraph);
              }
            }, 150);
      }

      $scope.stopBottomParagraphAdderTimer = function (paragraph) {
        console.log("Stop bottom")
        $scope.isMouseOut = true;
            $timeout.cancel($scope.timer);
            paragraph.bottomMouseOver = false
      }

      $scope.startTopParagraphAdderTimer = function (paragraph) {
        $scope.isMouseOut = false;
            $scope.timer = $timeout(function() {
              if (!$scope.isMouseOut) {
                
                $scope.$apply(function () {
                  
                  paragraph.topMouseOver = true;
                });
                document.getElementById('top'+paragraph.paragraphId).innerHTML = '|'
                // $scope.makeTopAppear(paragraph);
                
              }
            }, 150);
      }

      $scope.stopTopParagraphAdderTimer = function (paragraph) {
        $scope.isMouseOut = true;
            $timeout.cancel($scope.timer);
            paragraph.topMouseOver = false
            paragraph.topAdd = false;
      }

      $scope.thatRunFunction = function () {
        console.log("Sure did run")
      }

      $scope.lightUpLastVisiblePropositionInBook = function (book, event) {

        console.log("light up book")
        // console.log('light up book')
        // $scope.paragraphMouseIsOver = {};
        if (event.target.localName === 'li' || event.target.classList[0] === 'bottomparagraphadder' || event.target.classList[0] !== 'angular-ui-tree'){
          
          return;
        }
        for (var i = $scope.data[0].nodes.length-1; i > -1; i--){
          if (!$scope.data[0].nodes[i].minimized){
            for (var j = $scope.data[0].nodes[i].paragraphs.length-1; j > -1; j--){
              if (!$scope.data[0].nodes[i].paragraphs[j].hiddenForAll){
                for (var k = $scope.data[0].nodes[i].paragraphs[j].propositions.length-1; k > -1; k--){
                  if (!$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll &&
                    ($scope.data[0].documentClaimedBy === $scope.userId || $scope.data[0].nodes[i].paragraphs[j].propositions[k].type !== 'blank')){
                    if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[0] && !index && 
                      $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarksExpanded){
                      var nodeIndex = angular.copy(i)
                      var paragraphIndex = angular.copy(j)
                      var index = angular.copy(k)
                      var remarkIndex = null;
                      for (var m = $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].remarks.length-1; m > -1; m--){
                        if (!$scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].remarks[m].hiddenForAll){
                          var remarkIndex = angular.copy(m);
                          break;
                        }
                      }
                      if (remarkIndex || remarkIndex == 0){
                        setTimeout(function () {
                          $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].remarks[remarkIndex].preSelected = true;
                        }, 20);
                      } else {
                        setTimeout(function () {
                          
                            $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].preSelected = true;
                        // });
                   
                        }, 20);
                      }
                      return;

                    } else if (!index) {
                      var nodeIndex = angular.copy(i)
                      var paragraphIndex = angular.copy(j)
                      var index = angular.copy(k)
                      setTimeout(function () {
                        // $scope.$apply(function () {
                      
                            $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].preSelected = true;
                        // });

                      }, 20);
                      return;
                      // console.log("break didnt work")
                    }
                  }
                }
              }
            }
          }
        }


      };


      $scope.getLastVisiblePropositionInBook = function (book, event) {

       
       $scope.unHighlightParagraph();
       // if (event.target.classList[0] == 'sectiontitle'){
       // }

        console.log('get book')
        console.log("Get last event: ", angular.copy(event))
        $scope.whatHasBeenClicked = '';
        for (var i = $scope.data[0].nodes.length-1; i > -1; i--){
          if (!$scope.data[0].nodes[i].minimized){
            for (var j = $scope.data[0].nodes[i].paragraphs.length-1; j > -1; j--){
              if (!$scope.data[0].nodes[i].paragraphs[j].hiddenForAll){
                for (var k = $scope.data[0].nodes[i].paragraphs[j].propositions.length-1; k > -1; k--){
                  if (!$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll){
                    console.log("K hit: ", angular.copy(k))
                    if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].remarks[0] && !index &&
                      $scope.data[0].nodes[i].paragraphs[j].propositions[k].remarksExpanded){
                    
                      var nodeIndex = angular.copy(i)
                      var paragraphIndex = angular.copy(j)
                      var index = angular.copy(k)
                      var remarkIndex = null;
                      for (var m = $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].remarks.length-1; m > -1; m--){
                        if (!$scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].remarks[m].hiddenForAll &&
                          !$scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].remarks[m].rejoined){
                         
                          var remarkIndex = angular.copy(m);
                          break;
                        }
                      }
                      if (remarkIndex || remarkIndex === 0){
                            $scope.holdOnToThis = angular.copy(
                            $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].remarks[remarkIndex].id);
                        setTimeout(function () {
                          // console.log("Upper timeout element: ", document.getElementById($scope.holdOnToThis))
                            $scope.selectedProposition = $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].remarks[remarkIndex];
                            $scope.selectedParagraph = $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex];
                            $scope.selectedNode = $scope.data[0].nodes[nodeIndex];
                            focusFactory($scope.holdOnToThis)
                            $scope.holdOnToThis = '';
                        // });
                        
                        }, 20);
                      } else if ($scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].type !== "blank" ||
                        $scope.data[0].nodes[nodeIndex].sectionClaimedBy === $scope.userId){
                        setTimeout(function () {
                          document.getElementById('proposition' +
                            $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].id).click();
                        // });
                   
                        }, 20);
                      }
                      return;

                    } else if (!index) {
                      console.log("Else get last")
                      var nodeIndex = angular.copy(i)
                      var paragraphIndex = angular.copy(j)
                      var index = angular.copy(k)
                      if ($scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].type !== "blank" ||
                        $scope.data[0].nodes[nodeIndex].sectionClaimedBy === $scope.userId){
                        // console.log(nodeIndex," ", paragraphIndex, " ", index)
                        $scope.selectedParagraph = $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex];
                        setTimeout(function () {
                          // $scope.$apply(function () {
                            document.getElementById('proposition' +
                              $scope.data[0].nodes[nodeIndex].paragraphs[paragraphIndex].propositions[index].id).click();
                          // });

                        }, 20);
                        return;
                      }
                      
                    }
                  }
                }
              }
            }
          }
        }

      };

      $scope.blurLightUpLastVisiblePropositionInNode = function (node, event) {
        console.log("blur node")
        for (var i = node.paragraphs.length - 1; i > -1; i--) {
          if (node.paragraphs[i][$scope.userId] !== 'hidden' && !node.paragraphs[i].hiddenForAll) {
            for (var j = node.paragraphs[i].propositions.length - 1; j > -1; j--) {
              if (node.paragraphs[i].propositions[j][$scope.userId] !== 'hidden' && node.paragraphs[i].propositions[j].hiddenForAll !== true &&
                node.paragraphs[i].propositions[j].preSelected === true) {
                node.paragraphs[i].propositions[j].preSelected = false;
                return;
              }
            }
          }
        }
      };

      $scope.lightUpLastVisiblePropositionInNode = function (node, event) {
        console.log('light up node')
        if (event.target.localName !== 'ol') {
          return;
        }
        for (var i = node.paragraphs.length - 1; i > -1; i--) {
          if (node.paragraphs[i][$scope.userId] !== 'hidden' && !node.paragraphs[i].hiddenForAll) {
            for (var j = node.paragraphs[i].propositions.length - 1; j > -1; j--) {
              if (node.paragraphs[i].propositions[j][$scope.userId] !== 'hidden' && node.paragraphs[i].propositions[j].hiddenForAll !== true) {
                node.paragraphs[i].propositions[j].preSelected = true;
                return;
              }
            }
          }
        }
      };

      $scope.getLastVisiblePropositionInNode = function (node, event, element) {
        $scope.unHighlightParagraph();
        console.log("get node")
        if (event.target.localName !== 'ol') {
          console.log("Returning node for having clicked other")
          return;
        }
        $scope.selectedNode = node;
        var itsFoundIt = false;
        for (var i = node.paragraphs.length - 1; i > -1; i--) {
          if (node.paragraphs[i][$scope.userId] !== 'hidden' &&
            node.paragraphs[i].hiddenForAll !== true) {
            $scope.selectedParagraph = node.paragraphs[i];
            for (var j = node.paragraphs[i].propositions.length - 1; j > -1; j--) {
              if (node.paragraphs[i].propositions[j][$scope.userId] !== 'hidden' &&
                !node.paragraphs[i].propositions[j].hiddenForAll
                && !itsFoundIt) {
                $scope.selectedProposition = node.paragraphs[i].propositions[j];
                itsFoundIt = true;
                break;
              }
            }
          }
        }
        itsFoundIt = false;
        var id = $scope.selectedProposition.id;
        $timeout(function () {
          focusFactory(id);
        }, 10);
      };

      $scope.blurLightUpLastVisiblePropositionInParagraph = function (node, paragraph, event) {
        
        // for (var i = paragraph.propositions.length - 1; i > -1; i--) {
        //   if (paragraph.propositions[i][$scope.userId] !== 'hidden' && paragraph.propositions[i].hiddenForAll !== true &&
        //     paragraph.propositions[i].preSelected === true) {
        //     paragraph.propositions[i].preSelected = false;
        //     break;
        //   }
        // }


        // for (var i = node.paragraphs.length - 1; i > -1; i--){
          for (var j = paragraph.propositions.length - 1; j > -1; j--) {
            if (paragraph.propositions[j].remarks){
              for (var k = paragraph.propositions[j].remarks.length-1; k > -1; k--){
                if (!paragraph.propositions[j].remarks[k].hiddenForAll &&
                  paragraph.propositions[j].remarks[k][$scope.userId] !== 'hidden'){
                  paragraph.propositions[j].remarks[k].preSelected = false;
                  return;
                }
              }
            }
            if (paragraph.propositions[j][$scope.userId] !== 'hidden' && paragraph.propositions[j].hiddenForAll !== true) {
              paragraph.propositions[j].preSelected = false;
              return;
            }
          }
        // }


      };

      $scope.lightUpLastVisiblePropositionInParagraph = function (node, paragraph, event) {
        console.log("light up paragraph")
        if (event.target.localName !== 'ol') {
          console.log("Returning ol localname")
          return;
        }
        // console.log(event.target)
       
          for (var j = paragraph.propositions.length - 1; j > -1; j--) {
            if (paragraph.propositions[j].remarks){
              for (var k = paragraph.propositions[j].remarks.length - 1; k > -1; k--) {
                if (paragraph.propositions[j].remarks[k][$scope.userId] !== 'hidden' && paragraph.propositions[j].remarks[k].hiddenForAll !== true){
                  paragraph.propositions[j].remarks[k].preSelected = true;
                  return;
                }        
              }
            }
            if (paragraph.propositions[j][$scope.userId] !== 'hidden' && paragraph.propositions[j].hiddenForAll !== true &&
              ($scope.data[0].documentClaimedBy === $scope.userId || paragraph.propositions[j].type !== 'blank')) {
              paragraph.propositions[j].preSelected = true;
              return;
            }
          }
        
        
      };

      $scope.getLastVisiblePropositionInParagraph = function (node, paragraph, event) {
        $scope.unHighlightParagraph();  
        $scope.unHighlightNode();  
        if ($scope.draggingProposition || paragraph.leftAdd){
          console.log("Returning last in paragraph")
          return;
        }
        console.log("get paragraph")

        //regular clicks on lefts failing to get left


        $scope.selectedNode = node;
        $scope.selectedParagraph = paragraph;
        for (var i = paragraph.propositions.length - 1; i > -1; i--) {
          if (paragraph.propositions[i][$scope.userId] !== 'hidden' &&
            paragraph.propositions[i].hiddenForAll !== true) {
            if (paragraph.propositions[i].remarks[0] && !index){
              // var nodeIndex = angular.copy(i)
              // var paragraphIndex = angular.copy(j)
              var index = angular.copy(i)
              setTimeout(function () {
                  document.getElementById('proposition' +
                    paragraph.propositions[index].remarks[paragraph.propositions[index].remarks.length-1].id).click();
                // });

              }, 20);
              return;

            } else if (!index) {
              // var nodeIndex = angular.copy(i)
              // var paragraphIndex = angular.copy(j)
              var index = angular.copy(i)
              setTimeout(function () {
                  document.getElementById('proposition' +
                    paragraph.propositions[i].id).click();
                // });

              }, 20);
              return;
            }



          }
        }
        // var id = $scope.selectedProposition.id;

      };



      $scope.clearExpandingClass = function (remark) {
        if (!remark.assertionPath || !$scope.selectProposition) {

          return;
        }

        if (!$scope.toBeClearedLater.remarkId) {
          $scope.toBeClearedLater.remarkId = remark.id;
          $scope.toBeClearedLater.threadId = $scope.selectedThread.threadId;
        }

        $('#' + $scope.toBeClearedLater.remarkId + $scope.toBeClearedLater.threadId)
          .parent().hide();
        $scope.toBeClearedLater = {};
      };

      $scope.clearLater = function (remarkId, threadId) {
        if (remarkId !== $scope.selectedProposition.id &&
          threadId !== $scope.selectedThread.threadId) {
          $scope.toBeClearedLater = {
            remarkId: $scope.selectedProposition.id,
            threadId: $scope.selectedThread.threadId
          };
        } else {
          $scope.toBeClearedLater.remarkId = remarkId;
          $scope.toBeClearedLater.threadId = threadId;
        }

      };

      $scope.selectNodeByThread = function (thread) {

        for (var m = thread.remarks.length; m > -1; m--){
          if (thread.remarks[m].author === $scope.data[0].documentClaimedBy){
            var theTarget = thread.remarks[m].id
          }
        }

        for (var i = 0; i < $scope.data[0].nodes.length; i++){
          for (var j = 0; j < $scope.data[0].nodes[i].paragraphs.length; j++){
            for (var k = $scope.data[0].nodes[i].paragraphs[j].propositions.length; k > -1; k--){
              if ($scope.data[0].nodes[i].paragraphs[j].propositions[k].id === theTarget &&
               $scope.data[0].nodes[i].paragraphs[j].propositions[k][$scope.userId] !== 'hidden' &&
               !$scope.data[0].nodes[i].paragraphs[j].propositions[k].hiddenForAll){
                $scope.selectedNode = $scope.data[0].nodes[i];
              }
            }
          }
        }

        if ($scope.selectedProposition) {
          $scope.selectedProposition.dialogueSide = true;
        }
        temp = {};
      };

// ************** Generate the tree diagram  *****************

      $scope.initialize = function () {

        var margin = {top: 20, right: 120, bottom: 20, left: 120},
          width = 1200 - margin.right - margin.left,
          height = 550 - margin.top - margin.bottom;

        var i = 0,
          duration = 750;

        /*
         * [CE] d3.layout.tree() is now d3.tree() (d3 v4+)
         *
         * Removed:
         * var tree = d3.layout.tree()
         */
        var tree = d3.tree()
          .size([height, width]);

        /*
         * [CE] d3.svg.diagonal permanently removed (d3 v4+)
         * This is Mike Bostok's recommended replacement.
         *
         * Removed:
         * var diagonal = d3.svg.diagonal()
         *   .projection(function(d) { return [d.y, d.x]; });
        */
        function diagonal(d) {
          return 'M' + d.source.y + ',' + d.source.x +
            'C' + (d.source.y + d.target.y) / 2 + ',' + d.source.x +
            ' ' + (d.source.y + d.target.y) / 2 + ',' + d.target.x +
            ' ' + d.target.y + ',' + d.target.x;
        }

        d3.select('svg').remove();

        var svg = d3.select('.modal-body').append('svg')
          .attr('width', width + margin.right + margin.left)
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var root = {};
        angular.copy($scope.data[0], root);
        root.x0 = 0;
        root.y0 = 0;

        // Compute the new tree layout.
        /*
         * [CE]
         * 1. tree.nodes(...) replaced with tree(...) (d3 v4+)
         * 2. root children must be set to null as tree is empty.
         * 3. root must be passed through d3.hierarchy() before tree()
         *
         * Removed:
         * var nodes = tree.nodes(root).reverse(),
         */
        root.children = null;
        root = d3.hierarchy(root);
        var nodes = tree(root),
          links = root.links();


        // Normalize for fixed-depth.
        nodes.each(function (d) {
          d.y = d.depth * 90;
        });

        // Update the nodes…
        var node = svg.selectAll('g.node')
          .data(nodes, function (d) {
            return d.id || (d.id = ++i);
          });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append('g')
          .attr('class', 'node')
          .attr('transform', function (/*d*/) {
            return 'translate(' + root.y0 + ',' + root.x0 + ')';
          });

        nodeEnter.append('circle')
          .attr('r', 1e-6)
          .style('fill', function (d) {
            return d._children ? 'rgb(30,135,193)' : 'rgb(30,135,193)';
          });

        nodeEnter.append('foreignObject')
          .attr('x', -18)
          .attr('y', 30)
          .attr('width', 30)
          .text(function (d) {
            return d.topic;
          });

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
          .duration(duration)
          .attr('transform', function (d) {
            return 'translate(' + d.y + ',' + d.x + ')';
          });

        nodeUpdate.select('circle')
          .attr('r', 22)
          .style('fill', function (d) {
            return d._children ? 'lightsteelblue' : '#fff';
          });

        nodeUpdate.select('text')
          .style('color', 'rgb(255,255,255) !important');

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
          .duration(duration)
          .attr('transform', function (/*d*/) {
            return 'translate(' + root.y + ',' + root.x + ')';
          })
          .remove();
        nodeExit.select('circle')
          .attr('r', 22);

        nodeExit.select('text')
          .style('color', 'white');

        // Update the links…
        var link = svg.selectAll('path.link')
          .data(links, function (d) {
            return d.target.id;
          });

        // Enter any new links at the parent's previous position.
        link.enter().insert('path', 'g')
          .attr('class', 'link')
          .attr('d', function (/*d*/) {
            var o = {x: root.x0, y: root.y0};
            return diagonal({source: o, target: o});
          });
        // Transition links to their new position.
        link.transition()
          .duration(duration)
          .attr('d', diagonal);
        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
          .duration(duration)
          .attr('d', function (/*d*/) {
            var o = {x: root.x, y: root.y};
            return diagonal({root: o, target: o});
          })
          .remove();
        // Stash the old positions for transition.
        nodes.each(function (d) {
          d.x0 = d.x;
          d.y0 = d.y;
        });

      };



      var updateDialogue = function (payload, callback) {
        if ($scope.draggedProposition) {
          $scope.draggedProposition.comparator = payload.id;
        } else {
          $scope.draggedProposition.comparator = '';
        }
        if ((payload.blankParagraphForDeleter || payload.hideBlankParagraph) || $scope.draggedProposition.comparator ===
          payload.id) {

          // $scope.data[0].dialogue[$scope.data[0].dialogue.length - 1].remarks[0].text = '- Paragraph deleted -';
        } else {
          $scope.data[0].dialogue.push({
            class: payload.class,
            topic: payload.topic,
            address: payload.address,
            nodePath: (payload.nodePath ? payload.nodePath : undefined),
            oldNodePath: (payload.oldNodePath ? payload.oldNodePath : undefined),
            paragraphPosition: payload.paragraphPosition,
            question: (payload.question ? payload.question : undefined),
            threadId: $scope.scroll.threadId,
            remarks: [payload]
          });
          $scope.data[0].dialogue[$scope.data[0].dialogue.length - 1].remarks[0].deleted = true;
        }
        // Need to write for deletions of paragraphs
        // This disables interactivity for deleted remarks
        for (var i = 0; i < $scope.data[0].dialogue.length - 1; i++) {
          for (var j = 0; j < $scope.data[0].dialogue[i].remarks.length; j++) {
            if ($scope.data[0].dialogue[i].remarks[j].id === payload.id) {
              $scope.data[0].dialogue[i].remarks[j].hidden = true;
            } else if ($scope.data[0].dialogue[i].remarks[j].of) {
              if ($scope.data[0].dialogue[i].remarks[j].of.id === payload.id &&
                $scope.data[0].dialogue[i].remarks[j].type === 'negation') {
                $scope.data[0].dialogue[i].remarks[j].hidden = true;
              }
            }
          }
        }
        callback();
      };
      chatSocket.emit('room', $scope.bookId);
      $timeout(function() {
        if (!$scope.isGuest() && !$scope.loggedIn()) {
          apiService.signInAnonymously().then(function () {
            $state.go('main.editor', $stateParams);
          });
        }
      }, 10);
      for (var i = 0; i < $scope.data[0].dialogue.length; i++){
        $scope.data[0].dialogue[i].animate = false;
      }
      console.log("How about that multi authoredness: ", $scope.data[0].multiAuthor)




    }; // end mainLoop 

    $scope.onMenuClicked = function (key) {
      switch (key) {
        case 'profile':
          return $scope.openProfileModal();
        case 'settings':
          return $scope.openOptionsModal();
        case 'invert':
          return $scope.invert();
        case 'library':
          return $scope.openLibraryModal();
        case 'book':
          return $scope.openAddExistingBookModal();
        case 'copy':
          return $scope.copyBookIdToClipboard();
        case 'new':
          return $scope.openNewBookModal();
        case 'nav':
          return $scope.openNav();
        case 'only-me':
          if ($scope.loggedIn() || $rootScope.guest) {
            if (!$scope.othersAreHidden) {
              return $scope.hideOthersParagraphs();
            }
            return $scope.showOthersParagraphs();
          }
          return;
        case 'full-text':
          if ($scope.loggedIn() || $rootScope.guest) {
            if (!$scope.fullScreenText && $scope.data[0]) {
              return $scope.goFullScreenText();
            }
            return $scope.goSplitScreen();
          }
          return;
        case 'lossless':
          if ($scope.loggedIn() || $rootScope.guest) {
            if (!$scope.recycleRemarks) {
              return $scope.goRecycleRemarks();
            }
            return $scope.dontRecycleRemarks();
          }
          return;
        case 'export':
          // TODO
          return;
        case 'logout':
          return $scope.logout();
        default:
          return;
      }
    };

    $scope.menuButtons = [
      // {
      //   key: 'profile',
      //   icon: 'fa fa-user',
      //   tooltip: 'Profile',
      //   hoverColor: ColorFactory.random(),
      //   bgColor: '#ffffff'
      // },
      // {
      //   key: 'users',
      //   icon: 'fa fa-users',
      //   tooltip: 'Connected Users',
      //   hoverColor: ColorFactory.random(),
      //   bgColor: '#ffffff'
      // },
      // {
      //   key: 'settings',
      //   icon: 'fa fa-cog',
      //   tooltip: 'Settings',
      //   hoverColor: ColorFactory.random(),
      //   bgColor: '#ffffff',
      // },
      // {
      //   key: 'invert',
      //   icon: 'fas fa-sun',
      //   tooltip: 'Invert Colors',
      //   hoverColor: ColorFactory.random(),
      //   bgColor: '#ffffff',
      // },
      {
        key: 'only-me',
        icon: 'fa fa-user',
        tooltip: 'Toggle only me.',
        hoverColor: ColorFactory.random(),
        bgColor: '#ffffff',
      },
      {
        key: 'full-text',
        icon: 'fa fa-columns',
        tooltip: 'Toggle fullscreen / splitscreen',
        hoverColor: ColorFactory.random(),
        bgColor: '#ffffff',
      },
      {
        key: 'lossless',
        icon: 'fa fa-certificate',
        tooltip: 'Toggle remark recycling',
        hoverColor: ColorFactory.random(),
        bgColor: '#ffffff',
      },
      {
        key: 'library',
        icon: 'fa fa-bookmark',
        tooltip: 'Open your library',
        hoverColor: ColorFactory.random(),
        bgColor: '#ffffff',
      },
      {
        key: 'book',
        icon: 'fa fa-book',
        tooltip: 'Add an existing book',
        hoverColor: ColorFactory.random(),
        bgColor: '#ffffff',
      },
      {
        key: 'copy',
        icon: 'fa fa-share-square',
        tooltip: 'Copy book id to clipboard',
        hoverColor: ColorFactory.random(),
        bgColor: '#ffffff',
      },
      {
        key: 'new',
        icon: 'fa fa-plus',
        tooltip: 'Create a new book',
        hoverColor: ColorFactory.random(),
        bgColor: '#ffffff',
      },
      // {
      //   key: 'nav',
      //   icon: 'fa fa-asterisk',
      //   tooltip: 'Open nav',
      //   hoverColor: ColorFactory.random(),
      //   bgColor: '#ffffff',
      // },
      {
        key: 'export',
        icon: 'fa fa-file-export',
        tooltip: 'Export',
        hoverColor: '#00c3d5',
        bgColor: '#ffffff'
      },
      {
        key: 'logout',
        icon: 'fa fa-sign-out-alt',
        tooltip: 'Logout',
        hoverColor: '#ff3c3c',
        bgColor: '#ffffff',
        onClick: $scope.logout
      },
    ];

    $(document).ready(function() {
      $('[ui-view]').attr('id', 'wholedamneditor');
    });

    document.getElementById('wholedamneditor').style.backgroundColor = '#0C2340';
    document.getElementById('wholedamneditor').style.height = '100vh';
    
    if ($rootScope.guest && !$scope.bookId) {
      $scope.openNewBookModal();
    } else if (!$scope.bookId){
      
      $scope.openLibraryModal();
    } else if (!$rootScope.guest){
      // console.log("LAST ELSE")
      // $scope.openLibraryModal();
    }
  }

  angular.module('statements')
    .controller('EditorController', EditorController);

})();
