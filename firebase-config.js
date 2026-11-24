// firebase-config.js
// Módulo compartilhado: inicializa o Firebase UMA vez e exporta o Firestore.
// Responsável: Firebase & Data Lead
//
// COMO PREENCHER:
// Firebase Console > Configurações do projeto > Seus apps > App da Web > "Configuração do SDK".
// Cole os valores abaixo. (Essas chaves NÃO são secretas; a segurança vem das Regras do Firestore.)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCwie8GFwYv7Z8xfvLdHsiK9pm20kuzrCg",
    authDomain: "datavotocesf-c2de1.firebaseapp.com",
    projectId: "datavotocesf-c2de1",
    storageBucket: "datavotocesf-c2de1.firebasestorage.app",
    messagingSenderId: "61492991846",
    appId: "1:61492991846:web:be0b84c2372ca81b4adaa7",
    measurementId: "G-5QX42EDSFK"
  };


const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

// Nome da coleção exigido no briefing
export const COLECAO = "datavoto_cesf_respostas";
