import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

/**
 * "Already a member? Log in" entry. A gold-accented card, so returning members
 * see it at once instead of a small text link under the sign-up button.
 */
export function MemberLoginCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Already a member? Log in"
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 22,
        opacity: pressed ? 0.92 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <LinearGradient
        colors={["#390006", "#7C0015", "#2B1A1E"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          padding: 16,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: "rgba(244,209,112,0.55)",
        }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(244,209,112,0.16)",
            borderWidth: 1,
            borderColor: "#F4D170",
          }}
        >
          <Ionicons name="key" size={21} color="#F4D170" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              color: "#F4D170",
              fontFamily: "Poppins_700Bold",
              fontSize: 10,
              letterSpacing: 1.4,
            }}
          >
            ALREADY A MEMBER?
          </Text>
          <Text
            style={{
              color: "#FFFDFC",
              fontFamily: "Poppins_700Bold",
              fontSize: 17,
            }}
          >
            Log in with your password
          </Text>
          <Text
            style={{
              color: "rgba(255,253,252,0.78)",
              fontFamily: "Poppins_400Regular",
              fontSize: 12.5,
            }}
          >
            Your username and password
          </Text>
        </View>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F4D170",
          }}
        >
          <Ionicons name="arrow-forward" size={18} color="#390006" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}
