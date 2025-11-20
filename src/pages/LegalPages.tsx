import React from 'react';
import { ChevronLeft, FileText, Shield, Cookie } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * 📄 Layout comune per tutte le pagine legali
 */
const LegalPageLayout: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft size={24} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            {icon}
            <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <div className="prose prose-blue max-w-none">
            {children}
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <a href="/privacy" className="hover:text-blue-500 transition-colors mx-3">
            Privacy Policy
          </a>
          <span>•</span>
          <a href="/terms" className="hover:text-blue-500 transition-colors mx-3">
            Termini di Servizio
          </a>
          <span>•</span>
          <a href="/cookies" className="hover:text-blue-500 transition-colors mx-3">
            Cookie Policy
          </a>
        </div>
      </div>
    </div>
  );
};

/**
 * 🔒 Privacy Policy Page
 */
export const PrivacyPage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      icon={<Shield size={28} className="text-blue-500" />}
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-500">
          <strong>Ultimo aggiornamento:</strong> 20 Novembre 2025
        </p>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Introduzione</h2>
          <p className="text-gray-600 leading-relaxed">
            Benvenuto su <strong>Look Travel</strong> ("noi", "nostro", "l'App"). La tua privacy è importante per noi. 
            Questa Privacy Policy spiega quali dati personali raccogliamo, come li utilizziamo, con chi li condividiamo 
            e quali sono i tuoi diritti.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            Utilizzando Look Travel, accetti la raccolta e l'uso delle informazioni in conformità con questa policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Titolare del Trattamento</h2>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-gray-700">
              <strong>Titolare del Trattamento:</strong><br />
              [IL TUO NOME/RAGIONE SOCIALE]<br />
              [INDIRIZZO - se applicabile]<br />
              Email: <a href="mailto:[TUA_EMAIL]" className="text-blue-500 underline">[LA TUA EMAIL DI CONTATTO]</a>
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">3. Dati Personali Raccolti</h2>
          
          <h3 className="text-xl font-semibold text-gray-700 mb-3">3.1 Dati forniti direttamente da te:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li><strong>Email</strong> (obbligatorio per la registrazione)</li>
            <li><strong>Password</strong> (criptata, non accessibile da noi)</li>
            <li><strong>Nome visualizzato</strong> (display name)</li>
            <li><strong>Username</strong> (opzionale, univoco)</li>
            <li><strong>Foto profilo</strong> (opzionale)</li>
            <li><strong>Bio/Descrizione</strong> (opzionale)</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-700 mb-3 mt-6">3.2 Dati generati dall'uso dell'app:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Informazioni sui viaggi (nome, destinazioni, date, contenuti)</li>
            <li>Dati di condivisione (membri invitati, notifiche)</li>
            <li>Dati tecnici (IP temporaneo, dispositivo, browser)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">8. I Tuoi Diritti (GDPR)</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Hai i seguenti diritti sui tuoi dati personali:
          </p>
          
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-800">✅ Diritto di accesso</h4>
              <p className="text-sm text-gray-600">Puoi richiedere una copia dei tuoi dati personali.</p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold text-gray-800">✅ Diritto di rettifica</h4>
              <p className="text-sm text-gray-600">Puoi modificare nome, username, foto profilo dalle impostazioni.</p>
            </div>
            
            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-semibold text-gray-800">✅ Diritto alla cancellazione ("Diritto all'oblio")</h4>
              <p className="text-sm text-gray-600">
                Puoi eliminare il tuo account e tutti i dati associati tramite "Elimina account" nelle impostazioni. 
                L'eliminazione è permanente e irreversibile.
              </p>
            </div>
            
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold text-gray-800">✅ Diritto alla portabilità</h4>
              <p className="text-sm text-gray-600">
                Puoi esportare i tuoi viaggi in formato JSON tramite la funzione "Esporta" nell'app.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">14. Contatti</h2>
          <p className="text-gray-600 leading-relaxed">
            Per domande su questa Privacy Policy o sui tuoi dati personali:
          </p>
          <div className="mt-4 bg-gray-100 p-4 rounded-lg">
            <p className="text-gray-700">
              <strong>Email:</strong> <a href="mailto:[TUA_EMAIL]" className="text-blue-500 underline">[LA TUA EMAIL DI CONTATTO]</a><br />
              <strong>Risposta entro:</strong> 30 giorni (come previsto dal GDPR)
            </p>
          </div>
        </section>

        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <p className="text-2xl">🌍✈️</p>
          <p className="text-gray-500 text-sm mt-2">
            Grazie per aver scelto Look Travel!
          </p>
        </div>
      </div>
    </LegalPageLayout>
  );
};

/**
 * 📜 Terms of Service Page
 */
export const TermsPage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Termini e Condizioni"
      icon={<FileText size={28} className="text-purple-500" />}
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-500">
          <strong>Ultimo aggiornamento:</strong> 20 Novembre 2025
        </p>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Accettazione dei Termini</h2>
          <p className="text-gray-600 leading-relaxed">
            Benvenuto su <strong>Look Travel</strong>. Utilizzando Look Travel, accetti di essere vincolato 
            dai presenti Termini e Condizioni.
          </p>
          <div className="mt-4 bg-amber-50 p-4 rounded-lg border border-amber-200">
            <p className="text-amber-800 font-medium">
              ⚠️ Se non accetti questi Termini, non utilizzare il Servizio.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Descrizione del Servizio</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            Look Travel è un'applicazione per la <strong>pianificazione collaborativa di viaggi</strong>.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Creare e gestire itinerari di viaggio</li>
            <li>Organizzare attività, alloggi, spostamenti e spese</li>
            <li>Condividere viaggi con altri utenti</li>
            <li>Esportare e importare dati di viaggio</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Uso Accettabile</h2>
          
          <h3 className="text-xl font-semibold text-green-700 mb-3">✅ Cosa PUOI fare:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
            <li>Creare viaggi personali o condivisi</li>
            <li>Invitare altri utenti a collaborare</li>
            <li>Caricare foto e contenuti relativi ai tuoi viaggi</li>
            <li>Esportare i tuoi dati in qualsiasi momento</li>
          </ul>

          <h3 className="text-xl font-semibold text-red-700 mb-3">❌ Cosa NON PUOI fare:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Violare leggi o usare il servizio per attività illegali</li>
            <li>Caricare contenuti offensivi, violenti, diffamatori</li>
            <li>Inviare spam o molestare altri utenti</li>
            <li>Tentare di accedere a sistemi non autorizzati (hacking)</li>
            <li>Violare copyright di terzi</li>
          </ul>

          <div className="mt-4 bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-red-800 font-medium">
              ⚠️ Violazioni possono portare alla sospensione o eliminazione dell'account senza preavviso.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">14. Contatti</h2>
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-gray-700">
              <strong>Email:</strong> <a href="mailto:[TUA_EMAIL]" className="text-blue-500 underline">[LA TUA EMAIL DI CONTATTO]</a><br />
              <strong>Risposta entro:</strong> 30 giorni
            </p>
          </div>
        </section>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-center text-gray-600 font-medium">
            Utilizzando il Servizio, dichiari di aver letto, compreso e accettato questi Termini.
          </p>
        </div>
      </div>
    </LegalPageLayout>
  );
};

/**
 * 🍪 Cookie Policy Page
 */
export const CookiePage: React.FC = () => {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      icon={<Cookie size={28} className="text-orange-500" />}
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-500">
          <strong>Ultimo aggiornamento:</strong> 20 Novembre 2025
        </p>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Cosa sono i Cookie?</h2>
          <p className="text-gray-600 leading-relaxed">
            I <strong>cookie</strong> sono piccoli file di testo che vengono memorizzati sul tuo dispositivo 
            quando visiti un sito web. Permettono di ricordare le tue preferenze e migliorare l'esperienza utente.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Cookie utilizzati da Look Travel</h2>
          
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">SEMPRE ATTIVI</span>
                Cookie Essenziali
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Necessari per il funzionamento base del servizio. Non possono essere disattivati.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Firebase Auth Token:</strong> Mantiene la sessione di login</li>
                <li>• <strong>CSRF Token:</strong> Protezione da attacchi</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">OPZIONALI</span>
                Cookie Analitici
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Ci aiutano a capire come gli utenti usano l'app. Puoi rifiutarli senza impatto sulle funzionalità.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Google Analytics (Firebase):</strong> Statistiche anonime sull'uso dell'app</li>
                <li>• <strong>Dati NON raccolti:</strong> IP completo, dati personali identificabili</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Come Gestire i Cookie</h2>
          
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Tramite il Banner Cookie</h3>
          <p className="text-gray-600 leading-relaxed mb-4">
            Al primo accesso su Look Travel, vedrai un banner che ti permette di accettare, 
            rifiutare o personalizzare i cookie analitici.
          </p>

          <h3 className="text-lg font-semibold text-gray-700 mb-3">Tramite il Browser</h3>
          <p className="text-gray-600 leading-relaxed">
            Puoi bloccare o eliminare i cookie dalle impostazioni del tuo browser (Chrome, Firefox, Safari, Edge).
          </p>
          
          <div className="mt-4 bg-amber-50 p-4 rounded-lg border border-amber-200">
            <p className="text-amber-800 text-sm">
              ⚠️ <strong>Nota:</strong> Bloccare i cookie essenziali impedirà il funzionamento di Look Travel.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">10. Contatti</h2>
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-gray-700">
              <strong>Email:</strong> <a href="mailto:[TUA_EMAIL]" className="text-blue-500 underline">[LA TUA EMAIL DI CONTATTO]</a>
            </p>
          </div>
        </section>
      </div>
    </LegalPageLayout>
  );
};