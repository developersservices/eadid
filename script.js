const firebaseConfig = {
    apiKey: "AIzaSyA1kGDOAuQRqdgXHX3Ugjj_zL7_bqYXos0",
    authDomain: "myapp-3a874.firebaseapp.com",
    projectId: "myapp-3a874",
    storageBucket: "myapp-3a874.appspot.com",
    messagingSenderId: "430236087961",
    appId: "1:430236087961:web:d7b0e75c6cf2498c9b6a08"
  };
  firebase.initializeApp(firebaseConfig);
  const firestore = firebase.firestore(),
        auth = firebase.auth(),
        storage = firebase.storage();
  
  auth.onAuthStateChanged(user => {
    const loginModal = document.getElementById("loginModal");
    loginModal.style.display = user ? "none" : "flex";
    if (user) {
      const profilePicElem = document.getElementById("profilePic");
      if (profilePicElem)
        profilePicElem.src = user.photoURL || "images/default-profile.png";
    }
  });

  function isValidGmail(email) {
    return /^[^@\s]+@gmail\.com$/i.test(email);
  }
  
  const loginBtn = document.getElementById('loginBtn')
  const signupBtn = document.getElementById('signupBtn')
  const loginEmail = document.getElementById('loginEmail') 
  const loginPassword = document.getElementById('loginPassword');
  
  loginBtn.addEventListener('click', () => {
    const email = loginEmail.value.trim()
     const password = loginPassword.value.trim();
    if (!isValidGmail(email)) {
      alert("Enter a valid Email address.");
      return;
    }
    if (email && password) {
      auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
          const user = userCredential.user;
          user.reload().then(() => {
            if (!user.emailVerified) {
              user.sendEmailVerification()
                .then(() => {
                  alert("A verification email has been sent. Please verify your email before logging in.");
                  auth.signOut();
                })
                .catch(err => alert(`Verification Error: ${err.code} - ${err.message}`));
            } else {
              document.getElementById("loginModal").style.display = "none";
            }
          });
        })
        .catch(err => alert(`Login Error: ${err.code} - ${err.message}`));
    }
  });
  
  
  signupBtn.addEventListener('click', () => {
    const email = loginEmail.value.trim()
    const password = loginPassword.value.trim();
    if (!isValidGmail(email)) {
      alert("Enter a valid @gmail.com address.");
      return;
    }
    if (email && password) {
      auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
          const user = userCredential.user;
          return user.updateProfile({ displayName: email.split('@')[0] })
            .then(() => user.sendEmailVerification())
            .then(() => {
              alert("A verification email has been sent. Please check your inbox and verify your email before logging in.");
              auth.signOut();
            });
        })
        .catch(err => alert(`Signup Error: ${err.code} - ${err.message}`));
    }
  });
  
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  googleLoginBtn.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
      .then(result => {
        document.getElementById("loginModal").style.display = "none";
      })
      .catch(err => alert(`Google Login Error: ${err.code} - ${err.message}`));
  });
  
  document.getElementById('minimizeBtn').addEventListener('click', () => window.windowControls.minimize());
  document.getElementById('maximizeBtn').addEventListener('click', () => window.windowControls.maximize());
  document.getElementById('closeBtn').addEventListener('click', () => window.windowControls.close());
  
  const aboutModal = document.getElementById('aboutModal');
  document.getElementById('aboutBtn').addEventListener('click', () => aboutModal.style.display = 'flex');
  document.getElementById('closeAboutModal').addEventListener('click', () => aboutModal.style.display = 'none');
  aboutModal.addEventListener('click', e => { if (e.target === aboutModal) aboutModal.style.display = 'none'; });
  
  
  const updatesModal = document.getElementById('updatesModal');
  const updatesList = document.getElementById('updatesList');
  let updatesSocket = null;

  function openUpdatesModal() {
    updatesModal.style.display = 'flex';
    if (!updatesSocket) {
      updatesSocket = new WebSocket("wss://echo.websocket.org/updates");
      updatesSocket.onopen = () => {},
      updatesSocket.onmessage = e => {
        if (!e.data.startsWith("Request served by")) {
          const li = document.createElement('li');
          li.textContent = e.data;
          updatesList.appendChild(li);
        }
      };
      updatesSocket.onerror = err => console.error(err);
      updatesSocket.onclose = () => updatesSocket = null;
    }
  }
  document.getElementById('updatesBtn').addEventListener('click', openUpdatesModal);
  document.getElementById('closeUpdatesModal').addEventListener('click', () => updatesModal.style.display = 'none');
  updatesModal.addEventListener('click', e => { if (e.target === updatesModal) updatesModal.style.display = 'none'; });
  
  const dashboardContainer = document.getElementById('dashboardContainer'),
        dashboardUsername = document.getElementById('dashboardUsername'),
        dashboardEmail = document.getElementById('dashboardEmail'),
        dashboardCreditsSpan = document.getElementById('dashboardCredits'),
        chatContainer = document.getElementById('chatContainer'),
        forumContainer = document.getElementById('forumContainer');
  document.getElementById('dashboardBtn').addEventListener('click', async () => {
    const user = firebase.auth().currentUser;
    if (user) {
      dashboardUsername.textContent = user.displayName || user.email.split('@')[0] || "Anonymous";
      dashboardEmail.textContent = user.email;
      const userKey = user.displayName || user.email.split('@')[0];
      if (userKey) {
        const docSnap = await firestore.collection("users").doc(userKey).get();
        dashboardCreditsSpan.textContent = docSnap.exists ? (docSnap.data().credits || 0) : 0;
      } else {
        dashboardCreditsSpan.textContent = 0;
      }
    }
    chatContainer.style.display = forumContainer.style.display = 'none';
    dashboardContainer.style.display = 'flex';
  });
  
  document.getElementById('uploadPicBtn').addEventListener('click', async () => {
    const file = document.getElementById('profilePicInput').files[0],
          user = firebase.auth().currentUser,
          profilePicImg = document.getElementById('profilePic');
    if (!file) { alert("Select an image file."); return; }
    if (!user) { alert("Login required."); return; }
    try {
      const fileRef = storage.ref().child(`profile_pics/${user.uid}_${file.name}`);
      await fileRef.put(file);
      const url = await fileRef.getDownloadURL();
      await user.updateProfile({ photoURL: url });
      profilePicImg.src = url;
      alert("Profile picture updated.");
    } catch (err) {
      alert("Error uploading profile picture.");
    }
  });
  
  function linkify(text) {
    return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
  }
  function renderMedia(url, type) {
    if (!url || !type) return "";
    if (type === "sticker") return `<br><img src="${url}" style="max-width:300px; margin-top:5px; display:block;">`;
    if (type.startsWith("image")) return `<br><img src="${url}" style="max-width:300px; margin-top:5px; border-radius:4px; display:block;">`;
    if (type.startsWith("video"))
      return `<br><video controls style="max-width:300px; margin-top:5px; border-radius:4px; display:block;">
                <source src="${url}" type="${type}">Your browser does not support the video tag.
              </video>`;
    return "";
  }
  
  const forumInput = document.getElementById('forumInput'),
        forumSubmit = document.getElementById('forumSubmit'),
        forumPosts = document.getElementById('forumPosts');
  forumSubmit.addEventListener('click', async () => {
    const text = forumInput.value.trim(),
          user = firebase.auth().currentUser,
          userName = user ? (user.displayName || user.email.split('@')[0]) : "Anonymous";
    let fileUrl = "", fileType = "";
    const file = document.getElementById('forumFile').files[0];
    if (file) {
      const fileRef = storage.ref().child(`forum_files/${user.uid}_${file.name}`);
      await fileRef.put(file);
      fileUrl = await fileRef.getDownloadURL();
      fileType = file.type;
    }
    firestore.collection("forumPosts").add({
      userName, text, fileUrl, fileType,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      time: new Date().toLocaleDateString()
    }).then(() => {
      forumInput.value = "";
      document.getElementById('forumFile').value = "";
      firestore.collection("users").doc(userName).set({
        credits: firebase.firestore.FieldValue.increment(1)
      }, { merge: true });
    }).catch(err => console.error(err));
  });
  firestore.collection("forumPosts").orderBy("timestamp", "desc")
    .onSnapshot(snapshot => {
      forumPosts.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data(),
              mediaHtml = data.fileUrl ? renderMedia(data.fileUrl, data.fileType) : "";
        forumPosts.innerHTML += `
          <div class="forum-post">
            <strong style="font-size:16px; display:flex; align-items:center; gap:10px;" >
              <i class="ri-corner-left-down-line" style="font-size:26px;"></i>${data.userName || "Anonymous"}
              <em style="font-size:12px;">(${data.time || "Just now"})</em>
            </strong>
            <p style="font-size:14px; line-height:20px;">${linkify(data.text)}</p>
            ${mediaHtml}
          </div>`;
      });
    });
  
  const chatMessagesDiv = document.getElementById('chatMessages'),
        chatInput = document.getElementById('chatInput'),
        chatSendBtn = document.getElementById('chatSendBtn'),
        typingLoader = document.getElementById('typingLoader'),
        typingStatusCollection = firestore.collection("typingStatus");
  let typingTimeout;
  chatInput.addEventListener('input', () => {
    const user = firebase.auth().currentUser;
    if (!user) return;
    const userDoc = typingStatusCollection.doc(user.uid);
    if (chatInput.value.trim() !== "") {
      userDoc.set({ typing: true, userName: user.displayName || user.email.split('@')[0] });
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => { userDoc.set({ typing: false }); }, 3000);
    } else {
      userDoc.set({ typing: false });
    }
  });
  typingStatusCollection.onSnapshot(snapshot => {
    let typingUsers = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.typing && firebase.auth().currentUser && doc.id !== firebase.auth().currentUser.uid)
        typingUsers.push(data.userName || "Someone");
    });
    if (typingUsers.length > 0) {
      typingLoader.style.display = "block";
      typingLoader.textContent = typingUsers.length === 1 ? `${typingUsers[0]} is typing...` : `${typingUsers.join(", ")} are typing...`;
    } else {
      typingLoader.style.display = "none";
    }
  });
  
  document.getElementById('emojiToggle').addEventListener('click', () => {
    const emojiPicker = document.getElementById('emojiPicker'),
          stickerPicker = document.getElementById('stickerPicker');
    emojiPicker.style.display = (emojiPicker.style.display === 'block') ? 'none' : 'block';
    stickerPicker.style.display = 'none';
  });
  document.getElementById('stickerToggle').addEventListener('click', async () => {
    const stickerPicker = document.getElementById('stickerPicker');
    if (stickerPicker.style.display === 'block') { stickerPicker.style.display = 'none'; return; }
    if (!stickerPicker.innerHTML.trim()) {
      const apiKey = "1FQEo2nvaarypzmTvT0RY5leH7w33EXA",
            url = `https://api.giphy.com/v1/stickers/trending?api_key=${apiKey}&limit=100&rating=g`;
      try {
        const result = await (await fetch(url)).json();
        result.data && result.data.forEach(sticker => {
          const img = document.createElement('img');
          img.src = sticker.images.fixed_width.url;
          img.dataset.sticker = sticker.images.fixed_width.url;
          stickerPicker.appendChild(img);
        });
      } catch (error) { console.error(error); }
    }
    stickerPicker.style.display = 'block';
    document.getElementById('emojiPicker').style.display = 'none';
  });
  document.querySelectorAll('#emojiPicker span').forEach(emoji => {
    emoji.addEventListener('click', () => { chatInput.value += emoji.textContent; });
  });
  document.getElementById('stickerPicker').addEventListener('click', async (e) => {
    if (e.target.tagName.toLowerCase() === "img") {
      const stickerUrl = e.target.dataset.sticker,
            user = firebase.auth().currentUser,
            userName = user ? (user.displayName || user.email.split('@')[0]) : "Guest",
            photoURL = user ? user.photoURL || "" : "";
      try {
        await firestore.collection("chats").add({
          uid: user ? user.uid : null,
          userName, text: "", photoURL,
          fileUrl: stickerUrl, fileType: "sticker",
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('stickerPicker').style.display = 'none';
      } catch (err) { console.error(err); }
    }
  });
  chatSendBtn.addEventListener('click', async () => {
    const messageText = chatInput.value.trim(),
          user = firebase.auth().currentUser,
          userName = user ? (user.displayName || user.email.split('@')[0]) : "Guest",
          photoURL = user ? user.photoURL || "" : "";
    let fileUrl = "", fileType = "";
    const file = document.getElementById('chatFile').files[0];
    if (file) {
      const fileRef = storage.ref().child(`chat_files/${user.uid}_${file.name}`);
      await fileRef.put(file);
      fileUrl = await fileRef.getDownloadURL();
      fileType = file.type;
    }
    firestore.collection("chats").add({
      uid: user ? user.uid : null,
      userName, text: messageText,
      photoURL, fileUrl, fileType,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      chatInput.value = "";
      document.getElementById('chatFile').value = "";
    }).catch(err => console.error(err));
  });
  firestore.collection("chats").orderBy("timestamp", "asc")
    .onSnapshot(snapshot => {
      chatMessagesDiv.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data(),
              profileImg = data.photoURL 
                ? `<img src="${data.photoURL}" style="width:40px; height:40px; border-radius:50%; margin-right:5px;">`
                : `<img src="images/default-profile.png" style="width:40px; height:40px; border-radius:50%; margin-right:5px;">`,
              mediaHtml = data.fileUrl ? renderMedia(data.fileUrl, data.fileType) : "";
        chatMessagesDiv.innerHTML += `
          <div class="chat-message">
            <div style="display:flex; flex-direction: column; margin-bottom:10px;">
            <strong style='position: relative; left: 30px; top: 17px; width: 90%; transition: all ease-in 0.2s;' class='user__name'>${data.userName}:</strong>
              <i class="ri-corner-left-down-line" style="font-size:26px;"></i>
              <div style='width: 100%; display: flex; align-items: center; gap: 10px;'>${profileImg} <span style="font-size:17px;">${linkify(data.text)}</span></div>${mediaHtml}
            </div>
          </div>`;
      });
      chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    });
  
  document.getElementById('chatBtn').addEventListener('click', () => {
    chatContainer.style.display = 'flex';
    forumContainer.style.display = dashboardContainer.style.display = 'none';
  });
  document.getElementById('forumBtn').addEventListener('click', () => {
    forumContainer.style.display = 'flex';
    chatContainer.style.display = dashboardContainer.style.display = 'none';
  });
  
  const hamburger = document.querySelector('.hamburger')
  const slider = document.querySelector('.sidebar')

  hamburger.addEventListener('click', () => {
    slider.classList.toggle('activate')
  })