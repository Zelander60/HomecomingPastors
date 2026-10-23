import React, { useState } from 'react';
import { Download, Smartphone, Share2, MoreVertical, X } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'card' }> = ({
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'card' ? (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <img
              src="/hcoming_Logo.png"
              alt="Homecoming Ghana 2026"
              className="w-12 h-12 rounded-xl object-cover shadow-xs shrink-0"
            />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Installer Homecoming 2026 sur votre téléphone
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Ajoutez l’application Grâce Internationale Sahel sur l’écran d’accueil (Chrome
                Android, iPhone Safari ou PC) avec son icône officielle.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClick}
            className="min-h-[44px] px-4 py-2.5 text-xs font-semibold text-white bg-amber-700 rounded-xl hover:bg-amber-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Installer l’App Mobile</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="min-h-[40px] px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-700" />
          <span>Installer l’App</span>
        </button>
      )}

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-1 sm:hidden" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/hcoming_Logo.png"
                  alt="Homecoming Ghana 2026"
                  className="w-11 h-11 rounded-xl object-cover shadow-xs shrink-0"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Installer l’application mobile
                  </h3>
                  <p className="text-xs text-slate-500">
                    Grâce Internationale Sahel · Homecoming 2026
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="font-semibold text-slate-900">Sur iPhone / iPad (Safari) :</p>
                <ol className="space-y-2 text-xs leading-relaxed list-decimal list-inside">
                  <li>
                    Appuyez sur le bouton <strong>Partager</strong>{' '}
                    <Share2 className="w-3.5 h-3.5 inline text-amber-700" /> en bas de Safari.
                  </li>
                  <li>
                    Faites défiler et appuyez sur{' '}
                    <strong>« Sur l’écran d’accueil »</strong> (Add to Home Screen).
                  </li>
                  <li>
                    Appuyez sur <strong>Ajouter</strong> en haut à droite.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="font-semibold text-slate-900">
                  Sur Android (Chrome) ou Navigateur Mobile :
                </p>
                <ol className="space-y-2 text-xs leading-relaxed list-decimal list-inside">
                  <li>
                    Ouvrez l’application dans un onglet direct Chrome si vous êtes dans un aperçu.
                  </li>
                  <li>
                    Appuyez sur le menu{' '}
                    <MoreVertical className="w-3.5 h-3.5 inline text-amber-700" /> en haut à droite
                    de Chrome.
                  </li>
                  <li>
                    Sélectionnez <strong>« Installer l’application »</strong> ou{' '}
                    <strong>« Ajouter à l’écran d’accueil »</strong>.
                  </li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full min-h-[44px] rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white shadow-lg">
      <span>Mode Hors-Ligne — Les modifications sont sauvegardées sur votre appareil.</span>
    </div>
  );
};
