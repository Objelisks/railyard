export const log = (arg, label) => {
    if(label)
        console.log(label, arg)
    else
        console.log(arg)
    return arg
}