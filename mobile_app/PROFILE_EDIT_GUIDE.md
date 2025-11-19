# Profile Edit Feature Guide

## Overview

The profile editing feature allows users to customize their display name and profile picture from the menu/settings screen. Changes are persisted using Zustand store with AsyncStorage.

## Features Implemented

### 1. **Editable Profile Picture**

- Users can select a photo from their device's gallery
- Uses `expo-image-picker` for image selection
- Supports square cropping (1:1 aspect ratio) during selection
- Quality optimization at 80% for better performance
- Profile picture displays in:
  - Menu screen header (80x80 avatar)
  - Home screen header (40x40 avatar)

### 2. **Editable Display Name**

- Users can change their display name
- Text input with validation (trims whitespace)
- Defaults to "User" if no name is set
- Displays throughout the app

### 3. **Modern UI Modal**

- Bottom sheet modal with smooth slide animation
- Web3-styled gradient avatar preview
- Camera icon overlay on avatar for intuitive editing
- Cancel and Save buttons with gradient styling
- Responsive layout with proper spacing

## Store Integration

### WalletStore Updates

Added new fields to `store/walletStore.ts`:

```typescript
interface WalletState {
  // ... existing fields
  userProfilePicture: string | null; // URI or URL to profile picture

  // ... existing methods
  setUserProfilePicture: (uri: string | null) => void;
}
```

### Usage Example

```typescript
import { useWalletStore } from "@/store/walletStore";

const MyComponent = () => {
  const { userName, userProfilePicture, setUserName, setUserProfilePicture } =
    useWalletStore();

  // Update name
  setUserName("New Name");

  // Update profile picture
  setUserProfilePicture("file:///path/to/image.jpg");
};
```

## Implementation Details

### Menu Screen (`app/pages/menu.tsx`)

#### State Management

```typescript
const [showEditModal, setShowEditModal] = useState(false);
const [editedName, setEditedName] = useState(userName || "");
const [tempProfilePicture, setTempProfilePicture] =
  useState(userProfilePicture);
```

#### Image Picker

```typescript
const handlePickImage = async () => {
  // Request permissions
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== "granted") {
    Alert.alert(
      "Permission Required",
      "Please grant camera roll permissions to change your profile picture."
    );
    return;
  }

  // Launch image picker
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    setTempProfilePicture(result.assets[0].uri);
  }
};
```

#### Save Profile

```typescript
const handleSaveProfile = () => {
  if (editedName.trim()) {
    setUserName(editedName.trim());
  }
  if (tempProfilePicture) {
    setUserProfilePicture(tempProfilePicture);
  }
  setShowEditModal(false);
};
```

### Home Screen Integration (`app/(tabs)/index.tsx`)

Profile picture displays in the header:

```typescript
const { userProfilePicture } = useWalletStore();

<TouchableOpacity
  onPress={() => router.push("/pages/menu")}
  className="w-10 h-10 bg-white/20 rounded-full justify-center items-center mr-3 overflow-hidden"
>
  {userProfilePicture ? (
    <Image
      source={{ uri: userProfilePicture }}
      className="w-full h-full rounded-full"
      style={{ width: 40, height: 40, borderRadius: 20 }}
    />
  ) : (
    <Ionicons name="person-outline" size={22} color="white" />
  )}
</TouchableOpacity>
```

## UI Components

### Edit Button

Located in the top-right of the profile card:

```typescript
<TouchableOpacity
  onPress={handleOpenEditModal}
  style={styles.editButton}
  activeOpacity={0.7}
>
  <Ionicons name="pencil" size={16} color={colors.primary} />
</TouchableOpacity>
```

### Modal Structure

```
Modal (slide animation)
├── Modal Overlay (dark background)
└── Modal Content
    ├── Header (title + close button)
    ├── Profile Picture Section
    │   ├── Avatar with gradient border
    │   ├── Camera icon overlay
    │   └── Hint text
    ├── Name Input Section
    │   ├── Label
    │   └── TextInput
    └── Action Buttons
        ├── Cancel button
        └── Save button (gradient)
```

## Permissions

### iOS (`ios/Info.plist`)

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to set your profile picture.</string>
```

### Android (`android/app/src/main/AndroidManifest.xml`)

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

## Dependencies

```json
{
  "expo-image-picker": "^15.0.7"
}
```

Install with:

```bash
npm install expo-image-picker
```

## Styling

### Key Styles

- **Edit Button**: Positioned absolutely with semi-transparent primary color background
- **Avatar Gradient**: Uses theme colors (primary → secondary → accent)
- **Modal**: Bottom sheet with rounded top corners, full-width
- **Camera Icon**: White background with shadow, positioned at bottom-right of avatar
- **Input Field**: Themed with dynamic colors based on dark/light mode

### Responsive Design

- Modal adapts to theme colors (dark/light mode)
- All text colors use theme store for consistency
- Proper spacing and touch targets (minimum 44x44 for buttons)

## Data Flow

```
User clicks edit button
  ↓
Modal opens with current values
  ↓
User selects image from gallery
  ↓
Image picker returns local URI
  ↓
Preview updates in modal
  ↓
User enters/edits name
  ↓
User clicks "Save Changes"
  ↓
Data saves to Zustand store
  ↓
Zustand persists to AsyncStorage
  ↓
Modal closes
  ↓
UI updates throughout app
```

## Future Enhancements

### Possible Additions

1. **Camera Integration**: Allow users to take photos directly
2. **Image Compression**: Further optimize image sizes before storage
3. **Avatar Generation**: Generate default avatars from user initials
4. **Cloud Storage**: Upload profile pictures to cloud storage (IPFS, AWS S3, etc.)
5. **Profile Templates**: Provide pre-made avatar templates
6. **Validation**: Add character limits and input validation for names
7. **Remove Picture**: Add option to remove profile picture and revert to default icon
8. **Cropping Tools**: More advanced image editing capabilities

### Known Limitations

1. Profile pictures stored as local URIs (not synced across devices)
2. Images stored in AsyncStorage (size limitations)
3. No image format conversion (uses original format)
4. Requires manual permission grants on first use

## Testing Checklist

- [ ] Edit button visible on profile card
- [ ] Modal opens when edit button clicked
- [ ] Image picker requests permissions properly
- [ ] Selected image displays in modal preview
- [ ] Camera icon overlay visible on avatar
- [ ] Name input accepts text and updates
- [ ] Cancel button closes modal without saving
- [ ] Save button persists changes
- [ ] Profile picture displays in menu screen
- [ ] Profile picture displays in home screen header
- [ ] Changes persist after app restart
- [ ] Works in both dark and light modes
- [ ] Handles missing profile picture gracefully (shows default icon)
- [ ] Handles permission denial gracefully (shows alert)

## Troubleshooting

### Issue: Image picker not working

**Solution**: Check permissions in device settings and ensure expo-image-picker is properly installed.

### Issue: Profile picture not displaying

**Solution**: Verify the URI is valid and the image file still exists at that location.

### Issue: Changes not persisting

**Solution**: Check AsyncStorage implementation and ensure Zustand persist middleware is configured correctly.

### Issue: Modal not appearing

**Solution**: Check if `showEditModal` state is updating and modal `visible` prop is connected.

## Related Files

- `store/walletStore.ts` - Profile data storage
- `app/pages/menu.tsx` - Profile edit UI
- `app/(tabs)/index.tsx` - Profile picture display in home
- `store/themeStore.ts` - Color theming for UI components

## Resources

- [Expo Image Picker Documentation](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [React Native Modal](https://reactnative.dev/docs/modal)
- [AsyncStorage Best Practices](https://react-native-async-storage.github.io/async-storage/)
