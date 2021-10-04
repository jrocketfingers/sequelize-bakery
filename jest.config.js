module.exports = {
	// "roots": [
	//   "<rootDir>/src"
	// ],
	"testMatch": [
	  "**/__tests__/**/*.+(ts|tsx|js)",
	  "**/?(*.)+(spec|test).+(ts|tsx|js)"
	],
	"moduleNameMapper": {
		"@app/(.*)": "<rootDir>/src/$1",
	},
	"transform": {
	  "^.+\\.(ts|tsx)$": "ts-jest"
	},
  }