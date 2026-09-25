/* =====================================================
   CAMPUSCOMPASS AI CHAT
===================================================== */

(function () {
  "use strict";

  const API_URL = "http://localhost:3000/api/chat";

  let chatHistory = [];

  function getJSON(key, fallback) {
    try {
      const value =
        localStorage.getItem(key);

      return value
        ? JSON.parse(value)
        : fallback;

    } catch {
      return fallback;
    }
  }

  function getCampusCompassContext() {
    return {
      profile:
        getJSON(
          "campusCompassStudent",
          {}
        ),

      plan:
        getJSON(
          "campusCompassPlan",
          []
        ),

      taskState:
        getJSON(
          "campusCompassPlannerTasks",
          {}
        )
    };
  }

  function createChat() {
    if (
      document.getElementById(
        "campusCompassAI"
      )
    ) {
      return;
    }

    const launcher =
      document.createElement("button");

    launcher.className =
      "ai-chat-launcher";

    launcher.id =
      "aiChatLauncher";

    launcher.type =
      "button";

    launcher.setAttribute(
      "aria-label",
      "Open CampusCompass AI"
    );

    launcher.innerHTML = "🤖";

    const windowElement =
      document.createElement("section");

    windowElement.className =
      "ai-chat-window";

    windowElement.id =
      "campusCompassAI";

    windowElement.setAttribute(
      "aria-label",
      "CampusCompass AI"
    );

    windowElement.innerHTML = `
      <div class="ai-chat-header">

        <div class="ai-chat-brand">

          <div class="ai-chat-logo">
            🤖
          </div>

          <div>
            <div class="ai-chat-title">
              CampusCompass AI
            </div>

            <div class="ai-chat-status">
              ● Online
            </div>
          </div>

        </div>

        <button
          class="ai-chat-close"
          id="aiChatClose"
          type="button"
          aria-label="Close AI chat"
        >
          ×
        </button>

      </div>


      <div
        class="ai-chat-messages"
        id="aiChatMessages"
      ></div>


      <div
        class="ai-chat-typing"
        id="aiChatTyping"
      >
        <span></span>
        <span></span>
        <span></span>
        AI is thinking...
      </div>


      <div class="ai-chat-suggestions">

        <button
          class="ai-suggestion"
          type="button"
          data-message="What should I focus on today?"
        >
          Today's focus
        </button>

        <button
          class="ai-suggestion"
          type="button"
          data-message="Analyze my current progress."
        >
          Analyze progress
        </button>

        <button
          class="ai-suggestion"
          type="button"
          data-message="Break down my next task into smaller steps."
        >
          Break down task
        </button>

        <button
          class="ai-suggestion"
          type="button"
          data-message="Give me a short quiz based on what I am learning."
        >
          Quiz me
        </button>

      </div>


      <form
        class="ai-chat-input-area"
        id="aiChatForm"
      >

        <textarea
          class="ai-chat-input"
          id="aiChatInput"
          placeholder="Ask CampusCompass AI..."
          rows="1"
          maxlength="2000"
        ></textarea>

        <button
          class="ai-chat-send"
          id="aiChatSend"
          type="submit"
          aria-label="Send message"
        >
          ↑
        </button>

      </form>
    `;

    document.body.appendChild(
      launcher
    );

    document.body.appendChild(
      windowElement
    );

    bindEvents();

    addMessage(
      "assistant",
      "Hi! I'm your CampusCompass AI coach. I can help you plan your study time, understand difficult topics, break down tasks, analyze your progress, and prepare for your career. What would you like to work on?"
    );
  }

  function bindEvents() {
    const launcher =
      document.getElementById(
        "aiChatLauncher"
      );

    const chatWindow =
      document.getElementById(
        "campusCompassAI"
      );

    const closeButton =
      document.getElementById(
        "aiChatClose"
      );

    const form =
      document.getElementById(
        "aiChatForm"
      );

    const input =
      document.getElementById(
        "aiChatInput"
      );

    launcher.addEventListener(
      "click",
      () => {
        chatWindow.classList.toggle(
          "open"
        );

        if (
          chatWindow.classList.contains(
            "open"
          )
        ) {
          input.focus();
        }
      }
    );

    closeButton.addEventListener(
      "click",
      () => {
        chatWindow.classList.remove(
          "open"
        );
      }
    );

    form.addEventListener(
      "submit",
      event => {
        event.preventDefault();

        sendMessage();
      }
    );

    input.addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Enter" &&
          !event.shiftKey
        ) {
          event.preventDefault();

          sendMessage();
        }
      }
    );

    document
      .querySelectorAll(
        ".ai-suggestion"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            input.value =
              button.dataset.message || "";

            sendMessage();
          }
        );
      });
  }

  function addMessage(
    role,
    message
  ) {
    const container =
      document.getElementById(
        "aiChatMessages"
      );

    if (!container) {
      return;
    }

    const messageElement =
      document.createElement("div");

    messageElement.className =
      `ai-message ${role}`;

    messageElement.textContent =
      message;

    container.appendChild(
      messageElement
    );

    container.scrollTop =
      container.scrollHeight;
  }

  function setTyping(
    visible
  ) {
    const element =
      document.getElementById(
        "aiChatTyping"
      );

    if (!element) {
      return;
    }

    element.classList.toggle(
      "show",
      visible
    );
  }

  async function sendMessage() {
    const input =
      document.getElementById(
        "aiChatInput"
      );

    const sendButton =
      document.getElementById(
        "aiChatSend"
      );

    const message =
      input.value.trim();

    if (!message) {
      return;
    }

    addMessage(
      "user",
      message
    );

    input.value = "";

    sendButton.disabled = true;

    setTyping(true);

    try {
      const context =
        getCampusCompassContext();

      const response =
        await fetch(
          API_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              message,

              profile:
                context.profile,

              plan:
                context.plan,

              taskState:
                context.taskState,

              history:
                chatHistory
            })
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
          "AI request failed."
        );
      }

      const answer =
        data.answer ||
        "I couldn't generate a response.";

      chatHistory.push(
        {
          role: "user",
          content: message
        },
        {
          role: "assistant",
          content: answer
        }
      );

      chatHistory =
        chatHistory.slice(-10);

      addMessage(
        "assistant",
        answer
      );

    } catch (error) {
      console.error(
        "CampusCompass AI:",
        error
      );

      addMessage(
        "assistant",
        "I'm having trouble connecting right now. Please make sure the CampusCompass AI server is running and try again."
      );

    } finally {
      setTyping(false);

      sendButton.disabled =
        false;

      input.focus();
    }
  }

  window.CampusCompassAI = {
    open() {
      const chat =
        document.getElementById(
          "campusCompassAI"
        );

      if (chat) {
        chat.classList.add(
          "open"
        );
      }
    },

    close() {
      const chat =
        document.getElementById(
          "campusCompassAI"
        );

      if (chat) {
        chat.classList.remove(
          "open"
        );
      }
    },

    refreshContext() {
      chatHistory = [];
    }
  };

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      createChat
    );
  } else {
    createChat();
  }

})();
