# Firestore config for HYPRRIDE

Bookings made on hyprride.com are stored in Firestore — Firebase project **HYPRRIDE**
(`hyprride-7aaac`, owned by dhruva.narayana100@gmail.com), database `(default)` in
`asia-south1` (Mumbai), collection `bookings`. The admin panel subscribes to that
collection live, so every staff device sees the same board. Fleet availability
toggles live in the document `settings/fleet`.

The web-app config embedded in `booking.js` and `admin.js` (`FIREBASE_CONFIG`) belongs
to this project. These values are public identifiers, not secrets — access is
controlled by `firestore.rules`.

Deploy security rules after editing `firestore.rules`:

    cd firebase
    firebase deploy --only firestore:rules

(needs `npm i -g firebase-tools` and `firebase login`; in a non-interactive terminal
`firebase login` prints a URL and you finish with `firebase login <code>`)

Data browser: https://console.firebase.google.com/project/hyprride-7aaac/firestore

If you add a field to the booking object in `booking.js`, add it to the key list in
`isBookingShape()` in `firestore.rules` too, otherwise new bookings are rejected.
