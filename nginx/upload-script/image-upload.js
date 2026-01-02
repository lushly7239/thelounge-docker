/****************************
* @name        Self Hosted The Lounge IRC upload
* @version     4.0.0
* @author      cmd430
* @description Allow uploading images to catbox/imgbb when using Self Hosted The Lounge
* @changelog
*   4.0.0 - Upload provider and auth are now given via url params to allow easy script updates
*         - Special thanks to @Unified for giving me the idea
*
*   3.1.1 - Fix getting duplicate upload buttons when opening popups
*         - Catbox can once again send all file types
*
*   3.1.0 - Changed upload file by file picker to use button next to send the same as like site lounge
*         - imgbb upload progress fill is less jumpy
*
*   3.0.0 - Added option to use imgbb or catbox, imgbb has upload progress
*   2.0.0 - Inital public release
*   1.0.0 - Inital private release
****************************/

// src/utils.ts
var placeholderText = "[ uploading file ]";

class Utils {
  static insertUploadPlaceholder() {
    return Utils.insertText(placeholderText);
  }
  static insertUploadUrl(url) {
    if (Utils.containsText(placeholderText)) {
      return Utils.replaceText(placeholderText, url);
    }
    return Utils.insertText(url);
  }
  static removeUploadPlaceholder() {
    return Utils.removeText(placeholderText);
  }
  static containsText(text) {
    const textbox = document.getElementById("input");
    if (!(textbox instanceof HTMLTextAreaElement)) {
      throw new Error("Could not find textbox in upload");
    }
    return textbox.value.includes(text);
  }
  static insertText(text) {
    const textbox = document.getElementById("input");
    if (!(textbox instanceof HTMLTextAreaElement)) {
      throw new Error("Could not find textbox in upload");
    }
    const initStart = textbox.selectionStart;
    const headToCursor = initStart > 0 ? textbox.value.substring(0, initStart) + " " : "";
    const cursorToTail = textbox.value.substring(initStart);
    const textBeforeTail = headToCursor + text + " ";
    textbox.value = textBeforeTail + cursorToTail;
    textbox.selectionStart = textBeforeTail.length;
    textbox.selectionEnd = textBeforeTail.length;
    textbox.dispatchEvent(new Event("input"));
  }
  static replaceText(oldText, newText) {
    const textbox = document.getElementById("input");
    if (!(textbox instanceof HTMLTextAreaElement)) {
      throw new Error("Could not find textbox in upload");
    }
    textbox.value = textbox.value.replace(oldText, newText);
    textbox.dispatchEvent(new Event("input"));
  }
  static removeText(text) {
    return Utils.replaceText(text, "");
  }
  static showProgress() {
    const progressBar = document.querySelector("span#upload-progressbar");
    if (!(progressBar instanceof HTMLSpanElement)) {
      throw new Error("Could not find progress bar");
    }
    progressBar.style.visibility = "visible";
    progressBar.style.width = "0%";
  }
  static hideProgress() {
    const progressBar = document.querySelector("span#upload-progressbar");
    if (!(progressBar instanceof HTMLSpanElement)) {
      throw new Error("Could not find progress bar");
    }
    progressBar.style.visibility = "hidden";
    progressBar.style.width = "0%";
  }
  static setProgress(val) {
    const progressBar = document.querySelector("span#upload-progressbar");
    if (!(progressBar instanceof HTMLSpanElement)) {
      throw new Error("Could not find progress bar");
    }
    progressBar.style.width = `${val}%`;
  }
  static async removeEXIF(file) {
    const [type, subtype] = file.type.split("/");
    if (type !== "image" || subtype === "gif" || subtype === "avif") {
      return Promise.resolve(file);
    }
    const { promise, resolve } = Promise.withResolvers();
    const img = new Image;
    const objectURL = URL.createObjectURL(file);
    img.onerror = () => resolve(file);
    img.onload = () => {
      URL.revokeObjectURL(objectURL);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not get canvas context in upload");
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => resolve(new File([blob], file.name, {
        type: file.type
      })), file.type);
    };
    img.src = objectURL;
    return promise;
  }
  static anonymizeName(file) {
    const id = crypto.randomUUID().slice(24);
    const ext = /(?:\.([^.]+))?$/.exec(file.name)?.[1];
    const extWithDot = `.${ext}`;
    return new File([file], `${id}${ext != null ? extWithDot : ""}`, {
      type: file.type
    });
  }
  static async request(url, payload) {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest;
      xhr.upload.addEventListener("progress", ({ loaded, total }) => {
        const percentage = loaded / total * 100;
        document.dispatchEvent(new CustomEvent("upload_progress", {
          detail: Math.round(percentage)
        }));
      });
      xhr.addEventListener("load", () => resolve({
        ok: true,
        text() {
          return Promise.resolve(JSON.parse(xhr.responseText).data.url);
        }
      }));
      xhr.addEventListener("error", () => resolve({
        ok: false,
        status: xhr.status
      }));
      xhr.addEventListener("abort", () => resolve({
        ok: false,
        status: xhr.status
      }));
      xhr.open("POST", url, true);
      xhr.send(payload);
    });
  }
}

// src/uploader.ts
class Uploader {
  provider;
  constructor(provider) {
    this.provider = provider;
  }
  async upload(file) {
    if (this.provider.capabilities.progress) {
      return this.uploadWithProgress(file);
    }
    return this.uploadWithoutProgress(file);
  }
  get supported() {
    const fileTypes = this.provider.capabilities.supports;
    const supportedTypes = Object.keys(fileTypes).filter((k) => fileTypes[k]);
    return supportedTypes;
  }
  supports(mimetype) {
    const [type, _] = mimetype.split("/");
    return this.supported.includes(type);
  }
  get accept() {
    return this.supported.join("/*, ") + "/*";
  }
  async uploadWithProgress(file) {
    Utils.showProgress();
    try {
      const url = await this.provider.upload(file);
      Utils.insertUploadUrl(url);
    } catch (err) {
      alert(err);
    }
    Utils.hideProgress();
  }
  async uploadWithoutProgress(file) {
    Utils.insertUploadPlaceholder();
    try {
      const url = await this.provider.upload(file);
      Utils.insertUploadUrl(url);
    } catch (err) {
      alert(err);
    }
    Utils.removeUploadPlaceholder();
  }
}

// src/upload-providers/catbox.ts
class Catbox {
  capabilities = {
    progress: false,
    supports: {
      image: true,
      audio: true,
      video: true,
      text: true
    }
  };
  ttl;
  constructor(ttl) {
    this.ttl = ttl ?? "12h";
  }
  async upload(payload) {
    const formData = new FormData;
    formData.append("reqtype", "fileupload");
    formData.append("time", this.ttl);
    formData.append("fileToUpload", payload);
    const response = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", {
      method: "POST",
      body: formData
    });
    if (!response.ok) {
      throw new Error(`status code: ${response.status}`);
    }
    return response.text();
  }
}

// src/upload-providers/imgbb.ts
var { request } = Utils;

class ImgBB {
  capabilities = {
    progress: true,
    supports: {
      image: true,
      audio: false,
      video: false,
      text: false
    }
  };
  apiKey;
  ttl;
  constructor(apiKey, ttl) {
    this.apiKey = apiKey;
    this.ttl = this.validTTL(ttl ?? 43200);
  }
  async upload(payload) {
    const formData = new FormData;
    formData.append("image", payload);
    const response = await request(`https://api.imgbb.com/1/upload?expiration=${this.ttl}&key=${this.apiKey}`, formData);
    if (!response.ok) {
      throw new Error(`status code: ${response.status}`);
    }
    return response.text();
  }
  validTTL(val) {
    const min = 60;
    const max = 15552000;
    return Math.min(Math.max(val, min), max);
  }
}

// src/index.ts
var config = new URL(document.currentScript.src).searchParams;
var uploadProvider;
switch (config.get("provider")?.toLowerCase() ?? "default") {
  case "imgbb": {
    uploadProvider = new ImgBB(config.get("auth") ?? "");
    break;
  }
  case "catbox":
  default: {
    uploadProvider = new Catbox;
  }
}
var uploader = new Uploader(uploadProvider);
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("dragenter", (e) => e.preventDefault());
document.addEventListener("dragleave", (e) => e.preventDefault());
document.addEventListener("drop", async (e) => {
  e.preventDefault();
  if (e.dataTransfer == null)
    return;
  for (const dropItem of e.dataTransfer.files) {
    await processFile(dropItem);
  }
});
document.addEventListener("paste", async (e) => {
  if (e.clipboardData == null)
    return;
  for (const clipboardItem of e.clipboardData.items) {
    if (clipboardItem.kind !== "file")
      continue;
    await processFile(clipboardItem.getAsFile());
  }
});
var observer = new MutationObserver((mutations) => {
  if (!document.querySelector("div#chat-container") || document.querySelector("span#upload-tooltip"))
    return;
  const sendWrapper = document.querySelector("#submit-tooltip");
  const uploadWrapper = sendWrapper?.cloneNode(true);
  if (sendWrapper instanceof HTMLSpanElement && uploadWrapper instanceof HTMLSpanElement) {
    uploadWrapper.id = "upload-tooltip";
    uploadWrapper.ariaLabel = "Select file";
    const uploadButton = uploadWrapper.querySelector("button");
    uploadButton.id = "upload";
    uploadButton.ariaLabel = "Upload file";
    uploadButton.addEventListener("click", (e) => {
      e.preventDefault();
      const input = document.createElement("input");
      input.addEventListener("change", async () => {
        if (input.files == null)
          return;
        for (const inputFile of input.files) {
          await processFile(inputFile);
        }
      });
      input.type = "file";
      input.accept = uploader.accept;
      input.click();
    });
    sendWrapper.parentElement.insertBefore(uploadWrapper, sendWrapper);
  }
});
observer.observe(document.querySelector("div#viewport"), {
  attributes: false,
  characterData: false,
  childList: true,
  subtree: false
});
var style = document.createElement("style");
style.textContent = `
  #form > #upload-progressbar {
    transition: width 200ms linear;
  }
`;
document.head.appendChild(style);
document.addEventListener("upload_progress", (e) => Utils.setProgress(e.detail));
async function processFile(file) {
  if (!uploader.supports(file.type)) {
    return alert(`Unsupported file type: ${file.type} `);
  }
  try {
    const renamed = Utils.anonymizeName(file);
    const exifStripped = await Utils.removeEXIF(renamed);
    await uploader.upload(exifStripped);
  } catch (err) {
    alert(err);
  }
}