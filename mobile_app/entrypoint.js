// Import required polyfills first
import "fast-text-encoding";
//first
import "react-native-get-random-values";
//buffer
import { Buffer } from "buffer";
global.Buffer = Buffer;
//second
import "@ethersproject/shims";
// Then import the expo router
import "expo-router/entry";
