module.exports = {
	// "roots": [
	//   "<rootDir>/src"
	// ],
	"testMatch": [
	  "**/__tests__/**/*.+(ts|tsx)",
	  "**/?(*.)+(spec|test).+(ts|tsx)"
	],
	"moduleNameMapper": {
		"@app/(.*)": "<rootDir>/src/$1",
	},
	"transform": {
	  "^.+\\.(ts|tsx)$": "ts-jest"
	},
  }