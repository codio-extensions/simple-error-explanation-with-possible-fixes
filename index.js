// Wrapping the whole extension in a JS function and calling it immediately 
// (ensures all global variables set in this extension cannot be referenced outside its scope)
(async function(codioIDE, window) {
  
  // Refer to Anthropic's guide on system prompts: https://docs.anthropic.com/claude/docs/system-prompts
  const systemPrompt = `You are a helpful assistant helping students understand programming error messages.

You will be provided with a programming error message in the <error_message> tag.

If the error message does not match any of the generalized ones:
- Carefully review the <assignment> and <code>, if provided, to understand the context of the error
- Explain what is causing the error, and provide possible fixes and solutions as code snippets in markdown format
- If relevant, mention any common misconceptions that may be contributing to the student's error
- When referring to code in your explanation, use markdown syntax - wrap inline code with \` and
multiline code with \`\`\`
  `
    
  codioIDE.onErrorState((isError, error) => {
    console.log('codioIDE.onErrorState', {isError, error})
    if (isError) {
      codioIDE.coachBot.showTooltip("I can help explain this error...", () => {
        codioIDE.coachBot.open({id: "errorExpWithFixes", params: "tooltip"})
      })
    }
  })

  // register(id: unique button id, name: name of button visible in Coach, function: function to call when button is clicked) 
  codioIDE.coachBot.register("errorExpWithFixes", "Explain this error with fixes!", onButtonPress)

  async function onButtonPress(params) {
    // Function that automatically collects all available context 
    // returns the following object: {guidesPage, assignmentData, files, error}

    let context = await codioIDE.coachBot.getContext()
    console.log(context)

    let input

    if (params == "tooltip") { 
      input = context.error.text
      codioIDE.coachBot.write(context.error.text, codioIDE.coachBot.MESSAGE_ROLES.USER)
    } else {

      try {
        input = await codioIDE.coachBot.input("Please paste the error message you want me to explain!")
      }  catch (e) {
          if (e.message == "Cancelled") {
            codioIDE.coachBot.write("Please feel free to have any other error messages explained!")
            codioIDE.coachBot.showMenu()
            return
          }
      }
    }
   
    console.log(input)
    
    //Define your assistant's userPrompt - this is where you will provide all the context you collected along with the task you want the LLM to generate text for.
    const userPrompt = `Here is the error message:

<error_message>
${input}
</error_message>
 Here is the description of the programming assignment the student is working on:

<assignment>
${context.guidesPage.content}
</assignment>

Here is the student's current code:

<current_code>
${context.files[0]}
</current_code> 

If <assignment> and <code> are empty, assume that they're not available. 

Phrase your explanation directly addressing the student as 'you'.`

    const result = await codioIDE.coachBot.ask({
      systemPrompt: systemPrompt,
       messages: [{"role": "user", "content": userPrompt}]
    })
  
    codioIDE.coachBot.showMenu()
    
  }

})(window.codioIDE, window)