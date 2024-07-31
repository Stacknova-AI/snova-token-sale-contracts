import dotenv from "dotenv"

dotenv.config()

export function getEnvVariable(key: string, env: string) {
    const value = process.env[`${key}_${env.toUpperCase()}`]
    if (!value) {
        console.error(`Environment variable ${key}_${env.toUpperCase()} is not set.`)
        process.exit(1)
    }
    return value
}
