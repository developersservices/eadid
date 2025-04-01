document.addEventListener("DOMContentLoaded", function () {
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

  // Global variable to hold forum posts data and current search query.
  let forumPostsData = [];
  let searchQuery = "";

  // Log security events (errors, unauthorized actions, etc.)
  async function logSecurityEvent(eventType, details) {
    try {
      await firestore.collection("securityLogs").add({
        eventType,
        details,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error("Error logging security event:", err);
    }
  }

  // Log general user activity (e.g. login, forum search, posts, etc.)
  async function logActivity(activityType, details) {
    try {
      await firestore.collection("activityLogs").add({
        activityType,
        details,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error("Error logging activity:", err);
    }
  }

  // Reward system: increments user's credits in their document.
  async function rewardUser(userId, amount) {
    try {
      await firestore.collection("users").doc(userId).set({
        credits: firebase.firestore.FieldValue.increment(amount)
      }, { merge: true });
    } catch (err) {
      console.error("Error rewarding user:", err);
    }
  }

  function generateAvatarInitial(name) {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#007bff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const initial = name ? name.charAt(0).toUpperCase() : "?";
    ctx.fillText(initial, 50, 50);
    return canvas.toDataURL();
  }

  auth.onAuthStateChanged(user => {
    const loginModal = document.getElementById("loginModal");
    loginModal.style.display = user ? "none" : "flex";
    if (user) {
      const profilePicElem = document.getElementById("profilePic");
      if (profilePicElem) {
        profilePicElem.src =
          user.photoURL ||
          generateAvatarInitial(
            user.displayName || (user.email ? user.email.split("@")[0] : "Guest")
          );
      }
    }
  });

  function isValidEmail(email) {
    const allowedDomains = ["gmail.com", "example.com"];
    const emailRegex = /^[a-zA-Z0-9._]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
    const match = email.match(emailRegex);
    if (!match) return false;
    const domain = match[1].toLowerCase();
    return allowedDomains.includes(domain);
  }

  // Standard escape function.
  function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, match => {
      const escapeMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
      };
      return escapeMap[match];
    });
  }

  // This function escapes the text and highlights all occurrences of query.
  function escapeAndHighlight(text, query) {
    if (!text) return "";
    if (!query) return escapeHTML(text);
    const regex = new RegExp(`(${query})`, "gi");
    return text.split(regex).map(part => {
      if (part.toLowerCase() === query.toLowerCase()) {
        return `<span class="highlight">${escapeHTML(part)}</span>`;
      } else {
        return escapeHTML(part);
      }
    }).join("");
  }

  function containsForbiddenContent(text) {
    return text.toLowerCase().includes("empathy");
  }

  // Modified linkify: assumes text is already escaped.
  function linkify(text) {
    return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function parseMentionsAndLinks(text) {
    if (!text) return "";
    let linked = linkify(text);
    return linked.replace(/@([\w.]+)/g, '<span class="mention" data-user="$1">@$1</span>');
  }

  // --- Authentication Buttons (login, signup, google login) ---
  const loginBtn = document.getElementById("loginBtn"),
    signupBtn = document.getElementById("signupBtn"),
    loginEmail = document.getElementById("loginEmail"),
    loginPassword = document.getElementById("loginPassword");

  loginBtn.addEventListener("click", async () => {
    const email = loginEmail.value.trim(),
      password = loginPassword.value.trim();
    if (!isValidEmail(email)) {
      alert("Enter a valid email address from an allowed domain (e.g. gmail.com).");
      return;
    }
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      await user.reload();
      if (!user.emailVerified) {
        await user.sendEmailVerification();
        alert("A verification email has been sent. Please verify your email before logging in.");
        await auth.signOut();
        await logSecurityEvent("email_verification_required", `User ${email} attempted login without verification.`);
      } else {
        document.getElementById("loginModal").style.display = "none";
        await logActivity("login", `User ${email} logged in successfully.`);
      }
    } catch (err) {
      alert(`Login Error: ${err.code} - ${err.message}`);
      await logSecurityEvent("login_error", `Error during login for ${email}: ${err.code}`);
    }
  });

  signupBtn.addEventListener("click", async () => {
    const email = loginEmail.value.trim(),
      password = loginPassword.value.trim();
    if (!isValidEmail(email)) {
      alert("Enter a valid email address from an allowed domain (e.g. gmail.com).");
      return;
    }
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      await user.updateProfile({ displayName: email.split("@")[0] });
      await user.sendEmailVerification();
      alert("A verification email has been sent. Please check your inbox and verify your email before logging in.");
      await auth.signOut();
      await logSecurityEvent("signup", `New user signed up: ${email}`);
    } catch (err) {
      alert(`Signup Error: ${err.code} - ${err.message}`);
      await logSecurityEvent("signup_error", `Error during signup for ${email}: ${err.code}`);
    }
  });

  const googleLoginBtn = document.getElementById("googleLoginBtn");
  googleLoginBtn.addEventListener("click", async () => {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
      document.getElementById("loginModal").style.display = "none";
      await logActivity("login", "User logged in with Google.");
    } catch (err) {
      alert(`Google Login Error: ${err.code} - ${err.message}`);
      await logSecurityEvent("google_login_error", `Error during Google login: ${err.code}`);
    }
  });

  // --- Window Controls and Sidebar ---
  document.getElementById("minimizeBtn").addEventListener("click", () => window.windowControls.minimize());
  document.getElementById("maximizeBtn").addEventListener("click", () => window.windowControls.maximize());
  document.getElementById("closeBtn").addEventListener("click", () => window.windowControls.close());
  document.querySelector(".hamburger").addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("activate");
  });

  // --- About Modal ---
  const aboutModal = document.getElementById("aboutModal");
  document.getElementById("aboutBtn").addEventListener("click", () => aboutModal.style.display = "flex");
  document.getElementById("closeAboutModal").addEventListener("click", () => aboutModal.style.display = "none");
  aboutModal.addEventListener("click", e => {
    if (e.target === aboutModal) aboutModal.style.display = "none";
  });

  // --- Navigation between Chat, Forum, and Dashboard ---
  const chatContainer = document.getElementById("chatContainer"),
    forumContainer = document.getElementById("forumContainer"),
    dashboardContainer = document.getElementById("dashboardContainer");

  document.getElementById("chatBtn").addEventListener("click", () => {
    chatContainer.style.display = "flex";
    forumContainer.style.display = "none";
    dashboardContainer.style.display = "none";
  });

  document.getElementById("forumBtn").addEventListener("click", () => {
    forumContainer.style.display = "flex";
    chatContainer.style.display = "none";
    dashboardContainer.style.display = "none";
  });

  // --- Updates Modal ---
  const updatesModal = document.getElementById("updatesModal"),
    updatesList = document.getElementById("updatesList"),
    updateIndicator = document.getElementById("updateIndicator");
  let updatesSocket = null;

  function openUpdatesModal() {
    updatesModal.style.display = "flex";
    updateIndicator.style.display = "none";
    if (!updatesSocket) {
      updatesSocket = new WebSocket("wss://echo.websocket.org/updates");
      updatesSocket.onopen = () => { };
      updatesSocket.onmessage = e => {
        if (e.data.startsWith("Request served by")) return;
        const li = document.createElement("li");
        li.textContent = e.data;
        updatesList.appendChild(li);
        if (updatesModal.style.display !== "flex") {
          updateIndicator.style.display = "block";
        }
      };
      updatesSocket.onerror = err => console.error(err);
      updatesSocket.onclose = () => updatesSocket = null;
    }
  }

  document.getElementById("updatesBtn").addEventListener("click", openUpdatesModal);
  document.getElementById("closeUpdatesModal").addEventListener("click", () => updatesModal.style.display = "none");
  updatesModal.addEventListener("click", e => {
    if (e.target === updatesModal) updatesModal.style.display = "none";
  });

  // --- Forum Posts Rendering (using closures for delete) ---
  function renderForumPosts(posts) {
    const forumPostsContainer = document.getElementById("forumPosts");
    forumPostsContainer.innerHTML = "";
    posts.forEach(doc => {
      const data = doc.data;
      const currentUser = firebase.auth().currentUser;
      const canDelete = currentUser && currentUser.uid === data.uid;
      const mediaHtml = data.fileUrl ? renderMedia(data.fileUrl, data.fileType) : "";
      // Create a container element for the post.
      const postElem = document.createElement("div");
      postElem.className = "forum-post";
      postElem.innerHTML = `
        <strong style="font-size:16px; display:flex; align-items:center; gap:10px;">
          <i class="ri-corner-left-down-line" style="font-size:26px;"></i>
          ${escapeHTML(data.userName) || "Anonymous"}
          <em style="font-size:12px;">(${data.time || "Just now"})</em>
        </strong>
        <p style="font-size:14px; line-height:20px;">${linkify(escapeAndHighlight(data.text, searchQuery))}</p>
        ${mediaHtml}
      `;
      if (canDelete) {
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        // Attach event listener via closure (doc.id is not stored in DOM)
        deleteBtn.addEventListener("click", async () => {
          if (!confirm("Are you sure you want to delete this forum post?")) return;
          try {
            const docRef = firestore.collection("forumPosts").doc(doc.id);
            const docSnap = await docRef.get();
            if (!docSnap.exists) {
              alert("This post no longer exists.");
              return;
            }
            const docData = docSnap.data();
            const currentUser = firebase.auth().currentUser;
            if (!currentUser || currentUser.uid !== docData.uid) {
              alert("You do not have permission to delete this post.");
              await logSecurityEvent("unauthorized_delete", `Unauthorized forum post deletion attempt by ${currentUser ? currentUser.email : "Guest"}.`);
              return;
            }
            await docRef.delete();
            console.log("Forum post deleted");
          } catch (err) {
            console.error("Error deleting forum post:", err);
            await logSecurityEvent("delete_error", `Error deleting forum post: ${err.message}`);
          }
        });
        postElem.querySelector("strong").appendChild(deleteBtn);
      }
      forumPostsContainer.appendChild(postElem);
    });
  }

  // Listen for forum posts changes and store data for search.
  firestore.collection("forumPosts").orderBy("timestamp", "desc")
    .onSnapshot(snapshot => {
      forumPostsData = [];
      snapshot.forEach(doc => {
        forumPostsData.push({ id: doc.id, data: doc.data() });
      });
      renderForumPosts(forumPostsData);
    });

  // Forum search
  document.getElementById("forumSearchBtn").addEventListener("click", () => {
    const query = document.getElementById("forumSearch").value.trim().toLowerCase();
    searchQuery = query; // update global search query
    const user = firebase.auth().currentUser;
    if (user) {
      logActivity("forum_search", `User ${user.email} searched for "${query}"`);
    }
    if (query === "") {
      renderForumPosts(forumPostsData);
      return;
    }
    const filtered = forumPostsData.filter(doc => {
      const data = doc.data;
      return (data.text && data.text.toLowerCase().includes(query)) ||
        (data.userName && data.userName.toLowerCase().includes(query));
    });
    renderForumPosts(filtered);
  });

  // --- Dashboard Setup ---
  const dashboardUsername = document.getElementById("dashboardUsername"),
    dashboardEmail = document.getElementById("dashboardEmail"),
    dashboardCreditsSpan = document.getElementById("dashboardCredits");

  document.getElementById("dashboardBtn").addEventListener("click", async () => {
    const user = firebase.auth().currentUser;
    if (user) {
      const name = user.displayName || (user.email ? user.email.split("@")[0] : "Anonymous");
      dashboardUsername.textContent = name;
      dashboardEmail.textContent = user.email;
      try {
        const docSnap = await firestore.collection("users").doc(user.uid).get();
        dashboardCreditsSpan.textContent = docSnap.exists ? (docSnap.data().credits || 0) : 0;
      } catch (err) {
        console.error("Error fetching user data:", err);
        await logSecurityEvent("dashboard_error", `Error fetching data for ${user.email}: ${err.message}`);
      }
    }
    chatContainer.style.display = forumContainer.style.display = "none";
    dashboardContainer.style.display = "flex";
  });

  // --- Profile Picture Upload ---
  document.getElementById("uploadPicBtn").addEventListener("click", async () => {
    const file = document.getElementById("profilePicInput").files[0],
      user = firebase.auth().currentUser,
      profilePicImg = document.getElementById("profilePic");
    if (!file) {
      alert("Select an image file.");
      return;
    }
    if (!user) {
      alert("Login required.");
      return;
    }
    try {
      const fileRef = storage.ref().child(`profile_pics/${user.uid}_${file.name}`);
      await fileRef.put(file);
      const url = await fileRef.getDownloadURL();
      await user.updateProfile({ photoURL: url });
      profilePicImg.src = url;
      alert("Profile picture updated.");
      await logActivity("update_profile_pic", `User ${user.email} updated profile picture.`);
    } catch (err) {
      alert("Error uploading profile picture.");
      await logSecurityEvent("upload_error", `Error uploading profile picture for ${user.email}: ${err.message}`);
    }
  });

  function linkify(text) {
    return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  // --- Media Rendering ---
  function renderMedia(url, type) {
    if (!url || !type) return "";
    if (type === "sticker") {
      return `<br><img src="${url}" style="max-width:300px; margin-top:5px; display:block;">`;
    }
    if (type.startsWith("image")) {
      return `
        <br>
        <a href="#" class="img-overlay-link" data-image="${encodeURIComponent(url)}">
          <img src="${url}" style="max-width:300px; margin-top:5px; border-radius:4px; display:block; cursor:pointer;" alt="User Uploaded Image">
        </a>
      `;
    }
    if (type.startsWith("video")) {
      return `
        <br>
        <video controls style="max-width:300px; margin-top:5px; border-radius:4px; display:block;">
          <source src="${url}" type="${type}">
          Your browser does not support the video tag.
        </video>
      `;
    }
    return "";
  }

  // --- Forum Post Submission ---
  const forumInput = document.getElementById("forumInput"),
    forumSubmit = document.getElementById("forumSubmit");

  forumSubmit.addEventListener("click", async () => {
    const text = forumInput.value.trim(),
      user = firebase.auth().currentUser;
    if (!text) {
      alert("Cannot send an empty post.");
      return;
    }
    if (containsForbiddenContent(text)) {
      alert("Empathy messages are not allowed.");
      await logSecurityEvent("forum_post_blocked", `User ${user ? user.email : "Guest"} attempted to post forbidden content.`);
      return;
    }
    let fileUrl = "", fileType = "";
    try {
      const file = document.getElementById("forumFile").files[0];
      if (file) {
        const fileRef = storage.ref().child(`forum_files/${user.uid}_${file.name}`);
        await fileRef.put(file);
        fileUrl = await fileRef.getDownloadURL();
        fileType = file.type;
      }
      const userName = user
        ? (user.displayName || (user.email ? user.email.split("@")[0] : "Anonymous"))
        : "Anonymous";
      await firestore.collection("forumPosts").add({
        uid: user ? user.uid : null,
        userName,
        text: escapeHTML(text),
        fileUrl,
        fileType,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        time: new Date().toLocaleDateString()
      });
      forumInput.value = "";
      document.getElementById("forumFile").value = "";
      if (user) {
        await rewardUser(user.uid, 1);
      }
      await logActivity("forum_post", `User ${user ? user.email : "Guest"} posted in forum.`);
    } catch (err) {
      console.error("Error posting forum message:", err);
      await logSecurityEvent("forum_post_error", `Error posting forum message for ${user ? user.email : "Guest"}: ${err.message}`);
    }
  });

  // --- Chat Messages Rendering (using closures for delete) ---
  const chatMessagesDiv = document.getElementById("chatMessages");
  let chatLimit = 20;
  let chatUnsubscribe;

  function renderChatMessages(messages) {
    chatMessagesDiv.innerHTML = "";
    messages.forEach(message => {
      const data = message.data;
      const currentUser = firebase.auth().currentUser;
      const canDelete = currentUser && currentUser.uid === data.uid;
      const chatMessageElem = document.createElement("div");
      chatMessageElem.className = "chat-message";

      // Container for message content
      const messageContainer = document.createElement("div");
      messageContainer.style.display = "flex";
      messageContainer.style.flexDirection = "column";
      messageContainer.style.marginBottom = "10px";

      // Header with username and delete icon
      const header = document.createElement("strong");
      header.style.position = "relative";
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.justifyContent = "space-between";
      header.style.left = "30px";
      header.style.top = "17px";
      header.style.width = "90%";
      header.style.transition = "all ease-in 0.2s";
      header.className = "user__name";
      header.textContent = escapeHTML(data.userName) + ":";

      if (canDelete) {
        const deleteIcon = document.createElement("i");
        deleteIcon.className = "ri-delete-bin-7-line";
        deleteIcon.style.cursor = "pointer";
        deleteIcon.addEventListener("click", async () => {
          if (!confirm("Are you sure you want to delete this chat message?")) return;
          try {
            const docRef = firestore.collection("chats").doc(message.id);
            const docSnap = await docRef.get();
            if (!docSnap.exists) {
              alert("This message no longer exists.");
              return;
            }
            const docData = docSnap.data();
            const currentUser = firebase.auth().currentUser;
            if (!currentUser || currentUser.uid !== docData.uid) {
              alert("You do not have permission to delete this message.");
              await logSecurityEvent("unauthorized_delete", `Unauthorized chat message deletion attempt by ${currentUser ? currentUser.email : "Guest"}.`);
              return;
            }
            await docRef.delete();
            console.log("Chat message deleted");
          } catch (err) {
            console.error("Error deleting chat message:", err);
            await logSecurityEvent("delete_error", `Error deleting chat message: ${err.message}`);
          }
        });
        header.appendChild(deleteIcon);
      }

      messageContainer.appendChild(header);

      // Icon below header
      const iconElem = document.createElement("i");
      iconElem.className = "ri-corner-left-down-line";
      iconElem.style.fontSize = "26px";
      messageContainer.appendChild(iconElem);

      // Content: profile image and message text
      const contentContainer = document.createElement("div");
      contentContainer.style.width = "100%";
      contentContainer.style.display = "flex";
      contentContainer.style.alignItems = "center";
      contentContainer.style.gap = "10px";

      const profileImg = document.createElement("img");
      profileImg.style.width = "40px";
      profileImg.style.height = "40px";
      profileImg.style.borderRadius = "50%";
      profileImg.style.marginRight = "5px";
      if (data.photoURL) {
        profileImg.src = data.photoURL;
      } else {
        profileImg.src = generateAvatarInitial(data.userName);
      }
      contentContainer.appendChild(profileImg);

      const messageText = document.createElement("span");
      messageText.style.fontSize = "17px";
      messageText.innerHTML = parseMentionsAndLinks(data.text);
      contentContainer.appendChild(messageText);

      messageContainer.appendChild(contentContainer);

      // Append any media if available.
      if (data.fileUrl) {
        const mediaContainer = document.createElement("div");
        mediaContainer.innerHTML = renderMedia(data.fileUrl, data.fileType);
        messageContainer.appendChild(mediaContainer);
      }

      chatMessageElem.appendChild(messageContainer);
      chatMessagesDiv.appendChild(chatMessageElem);
    });

    if (chatLimit === 20) {
      chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    }
  }

  function loadChatMessages() {
    if (chatUnsubscribe) chatUnsubscribe();
    const chatQuery = firestore
      .collection("chats")
      .orderBy("timestamp", "desc")
      .limit(chatLimit);
    chatUnsubscribe = chatQuery.onSnapshot(snapshot => {
      const messages = [];
      snapshot.forEach(doc => {
        messages.push({ id: doc.id, data: doc.data() });
      });
      messages.reverse();
      renderChatMessages(messages);
    });
  }

  loadChatMessages();

  chatMessagesDiv.addEventListener("scroll", function () {
    if (chatMessagesDiv.scrollTop === 0) {
      chatLimit += 20;
      loadChatMessages();
    }
  });

  // --- Chat Input and Typing ---
  const chatInput = document.getElementById("chatInput"),
    chatSendBtn = document.getElementById("chatSendBtn"),
    typingLoader = document.getElementById("typingLoader"),
    typingStatusCollection = firestore.collection("typingStatus");
  let typingTimeout;

  chatInput.addEventListener("input", () => {
    const user = firebase.auth().currentUser;
    if (!user) return;
    const userDoc = typingStatusCollection.doc(user.uid);
    if (chatInput.value.trim() !== "") {
      userDoc.set({
        typing: true,
        userName: user.displayName || (user.email ? user.email.split("@")[0] : "Anonymous")
      });
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        userDoc.set({ typing: false });
      }, 3000);
    } else {
      userDoc.set({ typing: false });
    }
  });

  chatInput.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.keyCode === 13) && !e.shiftKey) {
      e.preventDefault();
      chatSendBtn.click();
    }
  });

  typingStatusCollection.onSnapshot(snapshot => {
    let typingUsers = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.typing && auth.currentUser && doc.id !== auth.currentUser.uid) {
        typingUsers.push(data.userName || "Someone");
      }
    });
    if (typingUsers.length > 0) {
      typingLoader.style.display = "block";
      typingLoader.textContent = typingUsers.length === 1
        ? `${typingUsers[0]} is typing...`
        : `${typingUsers.join(", ")} are typing...`;
    } else {
      typingLoader.style.display = "none";
    }
  });

  // --- Emoji & Sticker Pickers ---
  document.getElementById("emojiToggle").addEventListener("click", () => {
    const emojiPicker = document.getElementById("emojiPicker"),
      stickerPicker = document.getElementById("stickerPicker");
    emojiPicker.style.display = (emojiPicker.style.display === "block") ? "none" : "block";
    stickerPicker.style.display = "none";
  });

  document.getElementById("stickerToggle").addEventListener("click", async () => {
    const stickerPicker = document.getElementById("stickerPicker");
    if (stickerPicker.style.display === "block") {
      stickerPicker.style.display = "none";
      return;
    }
    if (!stickerPicker.innerHTML.trim()) {
      const apiKey = "1FQEo2nvaarypzmTvT0RY5leH7w33EXA",
        url = `https://api.giphy.com/v1/stickers/trending?api_key=${apiKey}&limit=100&rating=g`;
      try {
        const result = await (await fetch(url)).json();
        if (result.data) {
          result.data.forEach(sticker => {
            const img = document.createElement("img");
            img.src = sticker.images.fixed_width.url;
            img.dataset.sticker = sticker.images.fixed_width.url;
            stickerPicker.appendChild(img);
          });
        }
      } catch (error) {
        console.error(error);
      }
    }
    stickerPicker.style.display = "block";
    document.getElementById("emojiPicker").style.display = "none";
  });

  document.querySelectorAll("#emojiPicker span").forEach(emoji => {
    emoji.addEventListener("click", () => {
      chatInput.value += emoji.textContent;
    });
  });

  document.getElementById("stickerPicker").addEventListener("click", async (e) => {
    if (e.target.tagName.toLowerCase() === "img") {
      const stickerUrl = e.target.dataset.sticker,
        user = firebase.auth().currentUser,
        userName = user ? (user.displayName || (user.email ? user.email.split("@")[0] : "Guest")) : "Guest",
        photoURL = user ? user.photoURL || "" : "";
      try {
        await firestore.collection("chats").add({
          uid: user ? user.uid : null,
          userName,
          text: "",
          photoURL,
          fileUrl: stickerUrl,
          fileType: "sticker",
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById("stickerPicker").style.display = "none";
        if (user) {
          await rewardUser(user.uid, 1);
          await logActivity("sticker_post", `User ${user.email} posted a sticker.`);
        }
      } catch (err) {
        console.error(err);
        await logSecurityEvent("sticker_post_error", `Error posting sticker for ${user ? user.email : "Guest"}: ${err.message}`);
      }
    }
  });

  // --- Chat Message Submission ---
  chatSendBtn.addEventListener("click", async () => {
    const messageText = chatInput.value.trim(),
      user = firebase.auth().currentUser,
      userName = user ? (user.displayName || (user.email ? user.email.split("@")[0] : "Guest")) : "Guest",
      photoURL = user ? user.photoURL || "" : "";
    if (!messageText) {
      alert("Cannot send an empty message.");
      return;
    }
    if (containsForbiddenContent(messageText)) {
      alert("Empathy messages are not allowed.");
      await logSecurityEvent("chat_message_blocked", `User ${user ? user.email : "Guest"} attempted to send forbidden content.`);
      return;
    }
    let fileUrl = "", fileType = "";
    try {
      const file = document.getElementById("chatFile").files[0];
      if (file) {
        const fileRef = storage.ref().child(`chat_files/${user.uid}_${file.name}`);
        await fileRef.put(file);
        fileUrl = await fileRef.getDownloadURL();
        fileType = file.type;
      }
      await firestore.collection("chats").add({
        uid: user ? user.uid : null,
        userName,
        text: messageText,
        photoURL,
        fileUrl,
        fileType,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      chatInput.value = "";
      document.getElementById("chatFile").value = "";
      if (user) {
        await rewardUser(user.uid, 1);
        await logActivity("chat_post", `User ${user.email} sent a chat message.`);
      }
    } catch (err) {
      console.error("Error sending chat message:", err);
      await logSecurityEvent("chat_send_error", `Error sending chat message for ${user ? user.email : "Guest"}: ${err.message}`);
    }
  });

  // --- Remove old document-level deletion handlers ---
  // (They are no longer needed since deletion is handled in closures during rendering.)

}); // End of DOMContentLoaded

// --- Global Click for Mentions ---
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("mention")) {
    const mentionedUser = e.target.getAttribute("data-user");
    alert(`You clicked on mention: @${mentionedUser}`);
  }
});

// --- Image Overlay Functionality ---
function openImageOverlay(imageUrl) {
  let overlay = document.getElementById("imgOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "imgOverlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0,0,0,0.8)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "9999";
    overlay.style.cursor = "pointer";
    document.body.appendChild(overlay);
    overlay.addEventListener("click", () => {
      overlay.style.display = "none";
    });
  }
  overlay.innerHTML = `<img src="${imageUrl}" style="max-width:90%; max-height:90%;">`;
  overlay.style.display = "flex";
}

// Event delegation for image overlay links.
document.addEventListener("click", function (e) {
  const target = e.target.closest(".img-overlay-link");
  if (target) {
    e.preventDefault();
    const imageUrl = target.dataset.image ? decodeURIComponent(target.dataset.image) : "";
    if (imageUrl) {
      openImageOverlay(imageUrl);
    }
  }
});
